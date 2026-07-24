/**
 * Integration tests for the Orders API (Kanban #1705 and #1713).
 *
 * Covers: every CRUD endpoint, state machine transitions, voice callbacks,
 * status history, the API-key auth, and the
 * order.status.updated / order.created webhook events (teammate services
 * are MOCKED via global.fetch so we can capture and assert on payloads
 * without running the real SMS/Voice services).
 *
 * Runs against a real, separate test database (.env.test -> aiconfirmation_test).
 * `npm test` applies migrations automatically (tests/globalSetup.js); each
 * test starts from an empty database.
 */

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/prisma');

const API_KEY = process.env.API_KEY;

// Thin wrappers so every mutating call automatically carries the API key --
// avoids repeating .set('X-API-Key', ...) on every single request below.
const authPost = (path) => request(app).post(path).set('X-API-Key', API_KEY);
const authPut = (path) => request(app).put(path).set('X-API-Key', API_KEY);
const authPatch = (path) => request(app).patch(path).set('X-API-Key', API_KEY);
const authDelete = (path) => request(app).delete(path).set('X-API-Key', API_KEY);

let notificationCalls;

beforeEach(async () => {
  // Start every test from an empty database (children before parents)
  await prisma.statusHistory.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();

  // Reset the fetch mock; it answers "200 OK" like a healthy teammate service
  notificationCalls = [];
  global.fetch = jest.fn(async (url, options) => {
    notificationCalls.push({ url, body: JSON.parse(options.body) });
    return { ok: true, status: 200, text: async () => '' };
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

function validOrder(overrides = {}) {
  return {
    orderNumber: 'ORD-TEST-001',
    customerName: 'John Doe',
    customerPhone: '+21612345678',
    customerEmail: 'john@example.com',
    deliveryAddress: '123 Main Street, Tunis',
    totalAmount: 149.99,
    language: 'FR',
    serviceType: 'delivery',
    items: [
      { productName: 'Wireless Headphones', quantity: 2, unitPrice: 49.99, totalPrice: 99.98 },
      { productName: 'USB Cable', quantity: 1, unitPrice: 49.99, totalPrice: 49.99 },
    ],
    ...overrides,
  };
}

async function createOrder(overrides = {}) {
  const res = await authPost('/api/v1/orders').send(validOrder(overrides));
  return res.body.data;
}

// ===============================================================
// AUTH (Kanban #1711)
// ===============================================================
describe('API key auth', () => {
  test('blocks order creation without a key', async () => {
    const res = await request(app).post('/api/v1/orders').send(validOrder());
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Missing or invalid API key');
  });

  test('blocks order creation with a wrong key', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .set('X-API-Key', 'wrong-key')
      .send(validOrder());
    expect(res.status).toBe(401);
  });

  test('allows order creation with the correct key', async () => {
    const res = await authPost('/api/v1/orders').send(validOrder());
    expect(res.status).toBe(201);
  });

  test('does NOT require a key for read-only endpoints', async () => {
    const res = await request(app).get('/api/v1/orders');
    expect(res.status).toBe(200);
  });
});

// ===============================================================
// CRUD -- CREATE
// ===============================================================
describe('POST /api/v1/orders', () => {
  test('creates an order with items and returns 201 + PENDING', async () => {
    const res = await authPost('/api/v1/orders').send(validOrder());

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('PENDING');
    expect(res.body.data.items).toHaveLength(2);

    const items = await prisma.orderItem.findMany({ where: { orderId: res.body.data.id } });
    expect(items).toHaveLength(2);

    const history = await prisma.statusHistory.findMany({ where: { orderId: res.body.data.id } });
    expect(history).toHaveLength(1);
    expect(history[0].previousStatus).toBeNull(); // confirmed in Step 5
    expect(history[0].newStatus).toBe('PENDING');
  });

  test('emits the "order.created" event to the SMS service', async () => {
    await authPost('/api/v1/orders').send(validOrder());

    const smsCall = notificationCalls.find((c) => c.url.includes('/notify/order-created'));
    expect(smsCall).toBeDefined();
    expect(smsCall.body.event).toBe('order.created');
    expect(smsCall.body.data.orderNumber).toBe('ORD-TEST-001');
  });

  test('returns 422 with all missing-field messages for an empty body', async () => {
    const res = await authPost('/api/v1/orders').send({});

    expect(res.status).toBe(422);
    expect(res.body.error.details).toEqual([
      'Order number is required',
      'Customer name is required',
      'Customer phone is required',
      'Customer email is required', // <-- ADD THIS LINE
      'Delivery address is required',
      'Total amount is required',
      'Service type is required',
      'Items are required',
    ]);
  });

  test('returns 422 when no body is sent at all', async () => {
    const res = await authPost('/api/v1/orders');
    expect(res.status).toBe(422);
  });

  test('returns 400 for malformed JSON', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .set('X-API-Key', API_KEY)
      .set('Content-Type', 'application/json')
      .send('{invalid');

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Malformed JSON in request body');
  });

  test('returns 409 for a duplicate orderNumber', async () => {
    await authPost('/api/v1/orders').send(validOrder());
    const res = await authPost('/api/v1/orders').send(validOrder());
    expect(res.status).toBe(409);
  });
});

// ===============================================================
// CRUD -- READ
// ===============================================================
describe('GET /api/v1/orders', () => {
  test('lists all orders, newest first, no key required', async () => {
    await createOrder({ orderNumber: 'ORD-TEST-001' });
    await createOrder({ orderNumber: 'ORD-TEST-002' });

    const res = await request(app).get('/api/v1/orders');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].orderNumber).toBe('ORD-TEST-002');
  });
});

describe('GET /api/v1/orders/:id', () => {
  test('returns the order and its items', async () => {
    const order = await createOrder();
    const res = await request(app).get(`/api/v1/orders/${order.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(2);
  });

  test('returns 404 for a non-existent order', async () => {
    const res = await request(app).get('/api/v1/orders/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Order not found');
  });

  test('returns 400 for a malformed (non-UUID) id', async () => {
    const res = await request(app).get('/api/v1/orders/not-a-uuid');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Invalid ID format (expected a UUID)');
  });
});

// ===============================================================
// CRUD -- UPDATE
// ===============================================================
describe('PUT /api/v1/orders/:id', () => {
  test('updates editable fields, status untouched', async () => {
    const order = await createOrder();
    const res = await authPut(`/api/v1/orders/${order.id}`).send({ customerName: 'Jane Doe' });

    expect(res.status).toBe(200);
    expect(res.body.data.customerName).toBe('Jane Doe');
    expect(res.body.data.status).toBe('PENDING');
  });

  test('blocks the update without a key', async () => {
    const order = await createOrder();
    const res = await request(app).put(`/api/v1/orders/${order.id}`).send({ customerName: 'X' });
    expect(res.status).toBe(401);
  });

  test('returns 400 when the order is already in a final status', async () => {
    const order = await createOrder();
    await authPost(`/api/v1/orders/${order.id}/start-confirmation`);
    await authPatch(`/api/v1/orders/${order.id}/status`).send({ status: 'WAITING_FOR_CUSTOMER_CONFIRMATION' });
    await authPost(`/api/v1/orders/${order.id}/callbacks/voice`).send({ intent: 'CONFIRM', transcript: 'Yes' });

    const res = await authPut(`/api/v1/orders/${order.id}`).send({ customerName: 'Should Fail' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Cannot edit an order that is CONFIRMED');
  });
});

// ===============================================================
// CRUD -- DELETE
// ===============================================================
describe('DELETE /api/v1/orders/:id', () => {
  test('deletes the order and cascades items + history', async () => {
    const order = await createOrder();
    const res = await authDelete(`/api/v1/orders/${order.id}`);

    expect(res.status).toBe(200);
    expect(await prisma.order.findUnique({ where: { id: order.id } })).toBeNull();
    expect(await prisma.orderItem.findMany({ where: { orderId: order.id } })).toHaveLength(0);
    expect(await prisma.statusHistory.findMany({ where: { orderId: order.id } })).toHaveLength(0);
  });
});

// ===============================================================
// STATE MACHINE
// ===============================================================
describe('PATCH /api/v1/orders/:id/status', () => {
  test('valid transition succeeds and records history', async () => {
    const order = await createOrder();
    const res = await authPatch(`/api/v1/orders/${order.id}/status`)
      .send({ status: 'CONTACT_IN_PROGRESS', reason: 'Starting confirmation' });

    expect(res.status).toBe(200);

    const history = await prisma.statusHistory.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(history).toHaveLength(2);
    expect(history[1].previousStatus).toBe('PENDING');
    expect(history[1].newStatus).toBe('CONTACT_IN_PROGRESS');
  });

  test('invalid transition returns 400 with the exact reason', async () => {
    const order = await createOrder();
    const res = await authPatch(`/api/v1/orders/${order.id}/status`).send({ status: 'CONFIRMED' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Invalid status transition from PENDING to CONFIRMED');
  });

  test('emits "order.status.updated" on every transition (Step 6)', async () => {
    const order = await createOrder();
    notificationCalls.length = 0; // ignore the order.created call

    await authPatch(`/api/v1/orders/${order.id}/status`).send({ status: 'CONTACT_IN_PROGRESS' });

    const updateCall = notificationCalls.find((c) => c.url.includes('/notify/order-status-updated'));
    expect(updateCall).toBeDefined();
    expect(updateCall.body.data.status).toBe('CONTACT_IN_PROGRESS');

const voiceCall = notificationCalls.find((c) => c.url.includes('/call/initiate'));
    expect(voiceCall).toBeDefined();
  });

  test('notifications fire in the correct order across a full order lifecycle', async () => {
    const order = await createOrder();
    notificationCalls.length = 0; // ignore the order.created call from setup

    await authPost(`/api/v1/orders/${order.id}/start-confirmation`);
    await authPatch(`/api/v1/orders/${order.id}/status`).send({ status: 'WAITING_FOR_CUSTOMER_CONFIRMATION' });
    await authPost(`/api/v1/orders/${order.id}/callbacks/voice`).send({ intent: 'CONFIRM', transcript: 'Yes' });

    const eventNames = notificationCalls.map((c) => c.body.event);

    expect(eventNames).toEqual([
      'order.status.updated',        // PENDING -> CONTACT_IN_PROGRESS
      'order.confirmation.required', // voice service notified right after, same step
      'order.status.updated',        // -> WAITING_FOR_CUSTOMER_CONFIRMATION
      'order.status.updated',        // -> CONFIRMED
    ]);
  });
});

// ===============================================================
// VOICE CALLBACK
// ===============================================================
describe('POST /api/v1/orders/:id/callbacks/voice', () => {
  async function waitingOrder() {
    const order = await createOrder();
    await authPost(`/api/v1/orders/${order.id}/start-confirmation`);
    await authPatch(`/api/v1/orders/${order.id}/status`).send({ status: 'WAITING_FOR_CUSTOMER_CONFIRMATION' });
    return order;
  }

  test('CONFIRM maps to CONFIRMED', async () => {
    const order = await waitingOrder();
    const res = await authPost(`/api/v1/orders/${order.id}/callbacks/voice`)
      .send({ intent: 'CONFIRM', transcript: 'Yes, I confirm my order' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CONFIRMED');
  });

  test('DECLINE maps to REJECTED', async () => {
    const order = await waitingOrder();
    const res = await authPost(`/api/v1/orders/${order.id}/callbacks/voice`)
      .send({ intent: 'DECLINE', transcript: 'No, I refuse' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('REJECTED');
  });

  test('rejects an intent outside CONFIRM/DECLINE/MODIFY with 422', async () => {
    const order = await waitingOrder();
    const res = await authPost(`/api/v1/orders/${order.id}/callbacks/voice`)
      .send({ intent: 'UNREACHABLE', transcript: 'x' }); // confirms Issue 1 from our earlier discussion

    expect(res.status).toBe(422);
  });
});

// ===============================================================
// HISTORY
// ===============================================================
describe('GET /api/v1/orders/:id/history', () => {
  test('oldest first, starting from null', async () => {
    const order = await createOrder();
    await authPost(`/api/v1/orders/${order.id}/start-confirmation`);

    const res = await request(app).get(`/api/v1/orders/${order.id}/history`);

    expect(res.status).toBe(200);
    expect(res.body.data[0].previousStatus).toBeNull();
    expect(res.body.data[0].newStatus).toBe('PENDING');
    expect(res.body.data[1].previousStatus).toBe('PENDING');
    expect(res.body.data[1].newStatus).toBe('CONTACT_IN_PROGRESS');
  });
});

// ===============================================================
// SYSTEM
// ===============================================================
describe('GET /health', () => {
  test('returns 200 healthy, no key required', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('healthy');
  });
});