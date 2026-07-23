# AI Confirmation Backend

Order confirmation backend with status engine, REST APIs, and module coordination.

## Tech Stack

- Node.js >= 18 (required for native fetch API)
- Express.js
- PostgreSQL
- Prisma ORM
- Joi (validation)
- Swagger (API documentation)

## Prerequisites

- Node.js 18 or higher
- PostgreSQL running locally or accessible remotely
- Database `aiconfirmation` created with user `ai_confirmation_user`

## Setup

1. Copy `.env.example` to `.env` and fill in your database credentials:
   ```bash
   cp .env.example .env
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Generate Prisma client:
   ```bash
   npm run generate
   ```

4. Run database migrations:
   ```bash
   npm run migrate
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:3000` (or the port specified in your `.env` file).

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `start` | `node src/server.js` | Start in production mode |
| `dev` | `nodemon src/server.js` | Start in development mode with auto-restart |
| `migrate` | `npx prisma migrate dev` | Run database migrations (development) |
| `migrate:prod` | `npx prisma migrate deploy` | Run database migrations (production) |
| `generate` | `npx prisma generate` | Regenerate Prisma Client after schema changes |
| `studio` | `npx prisma studio` | Open Prisma Studio (database GUI) |
| `test` | `jest --runInBand` | Run the automated test suite (uses a separate test database) |
| `docs:json` | `node -e "..." > openapi.json` | Generate a static openapi.json file from the live Swagger spec |
| `migrate:test:reset` | `npx prisma migrate reset` (test DB only) | Drop, recreate, and reapply all migrations to the test database — for verifying the full migration history applies cleanly from scratch |

## Running Tests

The project includes an automated test suite (Jest + Supertest) in `tests/`.
Tests run against a separate database so development data is never touched.

1. Create the test database once:
```sql
   CREATE DATABASE aiconfirmation_test;
   GRANT ALL PRIVILEGES ON DATABASE aiconfirmation_test TO ai_confirmation_user;
   ALTER DATABASE aiconfirmation_test OWNER TO ai_confirmation_user;
```
2. Create a `.env.test` file (same variables as `.env.example`, plus a test `API_KEY`).
3. Run the tests (migrations are applied automatically):
```bash
   npm test
```


## API Documentation

Interactive Swagger documentation is available at:

```
http://localhost:3000/api-docs
```

## Order Status Flow

```
PENDING → CONTACT_IN_PROGRESS → WAITING_FOR_CUSTOMER_CONFIRMATION
                                              ↓
                    ┌─────────────┬───────────┼─────────────┐
                    ▼             ▼           ▼             ▼
                 CONFIRMED    REJECTED   CHANGE_REQUESTED  UNREACHABLE
                   (final)     (final)         │            (final)
                                               └→ CONTACT_IN_PROGRESS (new call)
```

Every status change is validated by the state machine (`src/constants/orderStatuses.js`)
and recorded in the `status_history` audit table (first entry: `previousStatus: null`).

## API Endpoints

### Orders

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/orders` | Create a new order | API key required |
| GET | `/api/v1/orders` | List all orders | Open |
| GET | `/api/v1/orders/:id` | Get a single order | Open |
| PUT | `/api/v1/orders/:id` | Update an order (not status) | API key required |
| DELETE | `/api/v1/orders/:id` | Delete an order | API key required |
| PATCH | `/api/v1/orders/:id/status` | Update order status | API key required |
| GET | `/api/v1/orders/:id/history` | Get order status history | Open |
| POST | `/api/v1/orders/:id/start-confirmation` | Start confirmation process | API key required |

### Callbacks

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/orders/:id/callbacks/voice` | AI Voice module callback | API key required |

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api-docs` | Swagger documentation |

## Authentication

All endpoints marked "API key required" above expect the key in a header:

```
X-API-Key: <your API_KEY value>
```

Missing or incorrect keys return `401 Unauthorized`. Read-only (`GET`) endpoints
and `/health` do not require a key. **The AI Voice module must send this header
on its callback request** (`POST /callbacks/voice`) or its integration will fail
with 401s.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3000 | Server port |
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `SMS_SERVICE_URL` | No | http://localhost:4000 | SMS/Email module URL |
| `VOICE_SERVICE_URL` | No | http://localhost:5000 | AI Voice module URL |
| `NODE_ENV` | No | development | Environment (development/production) |
| `API_KEY` | Yes | - | Shared key required on all write endpoints (see Authentication) |

## Module Integration

### SMS/Email Module

When an order is created, the backend sends a POST request to:
```
POST {SMS_SERVICE_URL}/notify/order-created
```

Payload:
```json
{
  "event": "order.created",
  "data": {
    "orderId": "...",
    "orderNumber": "ORD-2024-001",
    "customerName": "John Doe",
    "customerPhone": "+21612345678",
    "customerEmail": "john@example.com",
    "totalAmount": 149.99,
    "language": "FR",
    "serviceType": "delivery",
    "items": [...]
  }
}
```

On EVERY status change, the backend also sends:
```
POST {SMS_SERVICE_URL}/notify/order-status-updated
```

Payload:
```json
{
  "event": "order.status.updated",
  "data": {
    "orderId": "...",
    "orderNumber": "ORD-2024-001",
    "status": "CONFIRMED",
    "customerName": "John Doe",
    "customerPhone": "+21612345678",
    "customerEmail": "john@example.com",
    "deliveryAddress": "123 Main Street, Tunis",
    "totalAmount": 149.99,
    "language": "FR",
    "serviceType": "delivery",
    "items": [...]
  }
}
```

Use `status` = `CONFIRMED` / `REJECTED` / `UNREACHABLE` to trigger the final
confirmation email (CDC section 5); other statuses can be ignored.

### AI Voice Module

When an order enters CONTACT_IN_PROGRESS (i.e., the backend begins attempting to
reach the customer), it sends a POST request to:
```
POST {VOICE_SERVICE_URL}/call/initiate
```

Payload:
```json
{
  "event": "order.confirmation.required",
  "data": {
    "orderId": "...",
    "orderNumber": "ORD-2024-001",
    "customerName": "John Doe",
    "customerPhone": "+21612345678",
    "language": "FR",
    "serviceType": "delivery"
  }
}
```

After the call, the AI Voice module should send the result to:
```
POST /api/v1/orders/{orderId}/callbacks/voice
```

With body:
```json
{
  "intent": "CONFIRM",
  "transcript": "Yes, I confirm my order"
}
```

Valid intents: `CONFIRM`, `DECLINE`, `MODIFY`

**UNREACHABLE is NOT a voice intent.** If the customer cannot be reached after
several attempts, update the order through the status endpoint instead:

```
PATCH /api/v1/orders/{orderId}/status
{ "status": "UNREACHABLE", "reason": "No answer after 3 call attempts" }
```

**This endpoint requires the `X-API-Key` header** (see Authentication above) --
the AI Voice module must send it on every callback request.
