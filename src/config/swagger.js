const swaggerJsdoc = require('swagger-jsdoc');

/**
 * Swagger/OpenAPI configuration.
 * Generates API documentation from JSDoc comments in route files.
 */

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AI Confirmation Backend API',
      version: '1.0.0',
      description: 'Order confirmation backend with status engine, REST APIs, and module coordination.\n\nThis API is consumed by the frontend application and the other internship modules (SMS/Email, AI Voice).',
      contact: {
        name: 'AI Confirmation Backend Team',
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}/api/v1`,
        description: 'Development server',
      },
    ],
    tags: [
      {
        name: 'Orders',
        description: 'Order management operations',
      },
      {
        name: 'Callbacks',
        description: 'Endpoints for other modules to communicate results back',
      },
      {
        name: 'System',
        description: 'System-level endpoints',
      },
    ],
   components: {
      securitySchemes: {
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'Shared API key required for all mutating endpoints (POST, PUT, DELETE, PATCH).',
        },
      },
      schemas: {
        // ============================================================
        // REQUEST SCHEMAS
        // ============================================================
        
        OrderItem: {
          type: 'object',
          required: ['productName', 'quantity', 'unitPrice', 'totalPrice'],
          properties: {
            productName: {
              type: 'string',
              example: 'Wireless Headphones',
              description: 'Name of the product or service',
            },
            quantity: {
              type: 'integer',
              minimum: 1,
              example: 2,
              description: 'Quantity ordered',
            },
            unitPrice: {
              type: 'number',
              format: 'decimal',
              minimum: 0.01,
              example: 49.99,
              description: 'Price per unit',
            },
            totalPrice: {
              type: 'number',
              format: 'decimal',
              minimum: 0.01,
              example: 99.98,
              description: 'quantity × unitPrice',
            },
          },
        },

        CreateOrderRequest: {
          type: 'object',
          required: ['orderNumber', 'customerName', 'customerPhone', 'deliveryAddress', 'totalAmount', 'serviceType', 'items'],
          properties: {
            orderNumber: {
              type: 'string',
              example: 'ORD-2024-001',
              description: 'Human-readable unique order number',
            },
            customerName: {
              type: 'string',
              example: 'John Doe',
              description: 'Customer full name',
            },
            customerPhone: {
              type: 'string',
              example: '+21612345678',
              description: 'Customer phone number with country code',
            },
            customerEmail: {
              type: 'string',
              format: 'email',
              example: 'john.doe@example.com',
              description: 'Customer email address (optional)',
              nullable: true,
            },
            deliveryAddress: {
              type: 'string',
              example: '123 Main Street, Tunis',
              description: 'Delivery address',
            },
            totalAmount: {
              type: 'number',
              format: 'decimal',
              minimum: 0.01,
              example: 149.99,
              description: 'Total order value',
            },
            language: {
              type: 'string',
              enum: ['FR', 'AR', 'EN'],
              default: 'FR',
              example: 'FR',
              description: 'Customer preferred language',
            },
            serviceType: {
              type: 'string',
              example: 'delivery',
              description: 'Type of service',
            },
            notes: {
              type: 'string',
              example: 'Leave package at the door',
              description: 'Optional notes',
              nullable: true,
            },
            items: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/OrderItem',
              },
              minItems: 1,
              description: 'Order items (at least one required)',
            },
          },
        },

        UpdateOrderRequest: {
          type: 'object',
          minProperties: 1,
          properties: {
            orderNumber: { type: 'string', example: 'ORD-2024-001' },
            customerName: { type: 'string', example: 'John Doe' },
            customerPhone: { type: 'string', example: '+21612345678' },
            customerEmail: { type: 'string', example: 'john.doe@example.com', nullable: true },
            deliveryAddress: { type: 'string', example: '123 Main Street, Tunis' },
            totalAmount: { type: 'number', example: 149.99 },
            language: { type: 'string', enum: ['FR', 'AR', 'EN'] },
            serviceType: { type: 'string', example: 'delivery' },
            notes: { type: 'string', example: 'Updated notes', nullable: true },
          },
          description: 'At least one field must be provided. Status cannot be updated through this endpoint.',
        },

        UpdateStatusRequest: {
          type: 'object',
          required: ['status'],
          properties: {
            status: {
              type: 'string',
              enum: ['PENDING', 'CONTACT_IN_PROGRESS', 'WAITING_FOR_CUSTOMER_CONFIRMATION', 'CONFIRMED', 'REJECTED', 'CHANGE_REQUESTED', 'UNREACHABLE'],
              example: 'CONTACT_IN_PROGRESS',
              description: 'New order status',
            },
            reason: {
              type: 'string',
              example: 'Customer requested changes',
              description: 'Optional reason for the status change',
              nullable: true,
            },
          },
        },

        VoiceCallbackRequest: {
          type: 'object',
          required: ['intent', 'transcript'],
          properties: {
            intent: {
              type: 'string',
              enum: ['CONFIRM', 'DECLINE', 'MODIFY'],
              example: 'CONFIRM',
              description: 'Customer intent from voice interaction',
            },
            transcript: {
              type: 'string',
              example: 'Yes, I confirm my order',
              description: 'Full voice transcript',
            },
          },
        },

        // ============================================================
        // RESPONSE SCHEMAS
        // ============================================================

        OrderItemResponse: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
            orderId: { type: 'string', format: 'uuid' },
            productName: { type: 'string', example: 'Wireless Headphones' },
            quantity: { type: 'integer', example: 2 },
            unitPrice: { type: 'number', example: 49.99 },
            totalPrice: { type: 'number', example: 99.98 },
          },
        },

        OrderResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                orderNumber: { type: 'string', example: 'ORD-2024-001' },
                customerName: { type: 'string', example: 'John Doe' },
                customerPhone: { type: 'string', example: '+21612345678' },
                customerEmail: { type: 'string', example: 'john.doe@example.com', nullable: true },
                deliveryAddress: { type: 'string', example: '123 Main Street, Tunis' },
                totalAmount: { type: 'number', example: 149.99 },
                language: { type: 'string', example: 'FR' },
                serviceType: { type: 'string', example: 'delivery' },
                status: { type: 'string', example: 'PENDING' },
                notes: { type: 'string', nullable: true },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
                items: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/OrderItemResponse' },
                },
              },
            },
          },
        },

        OrdersListResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/OrderResponse/properties/data',
              },
            },
          },
        },

        StatusHistoryRecord: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            orderId: { type: 'string', format: 'uuid' },
            previousStatus: { type: 'string', example: 'PENDING' },
            newStatus: { type: 'string', example: 'CONTACT_IN_PROGRESS' },
            reason: { type: 'string', example: 'Confirmation process started', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },

        StatusHistoryListResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/StatusHistoryRecord' },
            },
          },
        },

        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                message: { type: 'string', example: 'Order not found' },
                details: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['"customerName" is required'],
                  nullable: true,
                },
              },
            },
          },
        },
      },
    },
  },
  // Paths are read from route files where JSDoc @openapi comments are defined
  apis: ['./src/routes/*.js', './src/app.js'],
};

const specs = swaggerJsdoc(options);

module.exports = specs;