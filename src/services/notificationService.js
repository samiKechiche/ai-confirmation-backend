/**
 * Notifier -- sends HTTP requests to teammate modules.
 *
 * Intern 2's service (SMS/Email) runs at SMS_SERVICE_URL
 * Intern 3's service (AI Voice) runs at VOICE_SERVICE_URL
 *
 * If a teammate's service is not running, the error is logged
 * but does NOT fail the order operation.
 */

const SMS_SERVICE_URL = process.env.SMS_SERVICE_URL || 'http://localhost:4000';
const VOICE_SERVICE_URL = process.env.VOICE_SERVICE_URL || 'http://localhost:5000';

// Timeout for fetch requests to teammate services (5 seconds)
const FETCH_TIMEOUT = 5000;

/**
 * Send a notification to the SMS/Email module when an order is created.
 * @param {Object} order - The created order
 */
async function notifySmsService(order) {
  try {
    const response = await fetch(`${SMS_SERVICE_URL}/notify/order-created`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'order.created',
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerEmail: order.customerEmail,
          totalAmount: parseFloat(order.totalAmount),
          language: order.language,
          serviceType: order.serviceType,
          items: order.items.map((item) => ({
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: parseFloat(item.unitPrice),
            totalPrice: parseFloat(item.totalPrice),
          })),
        },
      }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(
        `[NOTIFIER] SMS service returned ${response.status}: ${body}`
      );
      return;
    }

    console.log(`[NOTIFIER] SMS service notified for order ${order.orderNumber}`);
  } catch (err) {
    console.error(`[NOTIFIER] Failed to notify SMS service: ${err.message}`);
    // Do NOT throw -- order creation must succeed even if notification fails
  }
}

/**
 * Send a notification to the AI Voice module when confirmation is required.
 * @param {Object} order - The order requiring confirmation
 */
async function notifyVoiceService(order) {
  try {
    const response = await fetch(`${VOICE_SERVICE_URL}/call/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'order.confirmation.required',
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          language: order.language,
          serviceType: order.serviceType,
        },
      }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(
        `[NOTIFIER] Voice service returned ${response.status}: ${body}`
      );
      return;
    }

    console.log(`[NOTIFIER] Voice service notified for order ${order.orderNumber}`);
  } catch (err) {
    console.error(`[NOTIFIER] Failed to notify voice service: ${err.message}`);
    // Do NOT throw -- the status update must succeed even if notification fails
  }
}

/**
 * Send a notification to the SMS/Email module on EVERY order status change.
 * Intern 2's module uses this to trigger the recap/confirmation emails
 * (CDC section 5) -- e.g. the final confirmation email when the order
 * reaches CONFIRMED / REJECTED / UNREACHABLE.
 * @param {Object} order - The updated order (with items)
 */
async function notifyOrderStatusUpdate(order) {
  try {
    const response = await fetch(`${SMS_SERVICE_URL}/notify/order-status-updated`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'order.status.updated',
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerEmail: order.customerEmail,
          deliveryAddress: order.deliveryAddress,
          totalAmount: parseFloat(order.totalAmount),
          language: order.language,
          serviceType: order.serviceType,
          items: order.items.map((item) => ({
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: parseFloat(item.unitPrice),
            totalPrice: parseFloat(item.totalPrice),
          })),
        },
      }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(
        `[NOTIFIER] SMS service returned ${response.status}: ${body}`
      );
      return;
    }

    console.log(`[NOTIFIER] Status update (${order.status}) sent for order ${order.orderNumber}`);
  } catch (err) {
    console.error(`[NOTIFIER] Failed to send status update: ${err.message}`);
    // Do NOT throw -- the status update must succeed even if notification fails
  }
}

module.exports = {
  notifySmsService,
  notifyVoiceService,
  notifyOrderStatusUpdate,
};
