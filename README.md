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

## API Documentation

Interactive Swagger documentation is available at:

```
http://localhost:3000/api-docs
```

## API Endpoints

### Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/orders` | Create a new order |
| GET | `/api/v1/orders` | List all orders |
| GET | `/api/v1/orders/:id` | Get a single order |
| PUT | `/api/v1/orders/:id` | Update an order (not status) |
| DELETE | `/api/v1/orders/:id` | Delete an order |
| PATCH | `/api/v1/orders/:id/status` | Update order status |
| GET | `/api/v1/orders/:id/history` | Get order status history |
| POST | `/api/v1/orders/:id/start-confirmation` | Start confirmation process |

### Callbacks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/orders/:id/callbacks/voice` | AI Voice module callback |

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api-docs` | Swagger documentation |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3000 | Server port |
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `SMS_SERVICE_URL` | No | http://localhost:4000 | SMS/Email module URL |
| `VOICE_SERVICE_URL` | No | http://localhost:5000 | AI Voice module URL |
| `NODE_ENV` | No | development | Environment (development/production) |

## Integration with Teammate Modules

### SMS/Email Module (Intern 2)

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

### AI Voice Module (Intern 3)

When confirmation starts, the backend sends a POST request to:
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
