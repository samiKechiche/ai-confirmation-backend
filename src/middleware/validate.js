const Joi = require('joi');
const { sendError } = require('../utils/response');
const { ORDER_STATUS } = require('../constants/orderStatuses');
// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Convert a Joi validation error into a clean error response.
 */
function formatJoiError(error) {
  return error.details.map((detail) => detail.message);
}

/**
 * Create validation middleware from a Joi schema.
 * @param {Joi.Schema} schema - Joi schema to validate against
 * @returns {Function} Express middleware
 */
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Report all errors, not just the first
      stripUnknown: true, // Remove unknown fields
    });

    if (error) {
      return sendError(res, 'Validation failed', 422, formatJoiError(error));
    }

    // Replace req.body with validated/cleaned data
    req.body = value;
    next();
  };
}

// ============================================================
// JOI SCHEMAS
// ============================================================

const orderItemSchema = Joi.object({
  productName: Joi.string().min(1).max(255).required()
    .messages({
      'string.empty': 'Product name is required',
      'any.required': 'Product name is required',
    }),
  quantity: Joi.number().integer().min(1).required()
    .messages({
      'number.min': 'Quantity must be at least 1',
      'any.required': 'Quantity is required',
    }),
  unitPrice: Joi.number().positive().precision(2).required()
    .messages({
      'number.positive': 'Unit price must be greater than zero',
      'any.required': 'Unit price is required',
    }),
  totalPrice: Joi.number().positive().precision(2).required()
    .messages({
      'number.positive': 'Total price must be greater than zero',
      'any.required': 'Total price is required',
    }),
});

const createOrderSchema = Joi.object({
  orderNumber: Joi.string().min(1).max(100).required()
    .messages({
      'string.empty': 'Order number is required',
      'any.required': 'Order number is required',
    }),
  customerName: Joi.string().min(1).max(255).required()
    .messages({
      'string.empty': 'Customer name is required',
      'any.required': 'Customer name is required',
    }),
  customerPhone: Joi.string().min(5).max(30).required()
    .messages({
      'string.empty': 'Customer phone is required',
      'any.required': 'Customer phone is required',
    }),
  customerEmail: Joi.string().email().allow(null, '').optional()
    .messages({
      'string.email': 'Please provide a valid email address',
    }),
  deliveryAddress: Joi.string().min(1).max(500).required()
    .messages({
      'string.empty': 'Delivery address is required',
      'any.required': 'Delivery address is required',
    }),
  totalAmount: Joi.number().positive().precision(2).required()
    .messages({
      'number.positive': 'Total amount must be greater than zero',
      'any.required': 'Total amount is required',
    }),
  language: Joi.string().valid('FR', 'AR', 'EN').default('FR')
    .messages({
      'any.only': 'Language must be FR, AR, or EN',
    }),
  serviceType: Joi.string().min(1).max(100).required()
    .messages({
      'string.empty': 'Service type is required',
      'any.required': 'Service type is required',
    }),
  notes: Joi.string().max(1000).allow(null, '').optional(),
  items: Joi.array().items(orderItemSchema).min(1).required()
    .messages({
      'array.min': 'At least one order item is required',
      'any.required': 'Items are required',
    }),
});

const updateOrderSchema = Joi.object({
  orderNumber: Joi.string().min(1).max(100).optional(),
  customerName: Joi.string().min(1).max(255).optional(),
  customerPhone: Joi.string().min(5).max(30).optional(),
  customerEmail: Joi.string().email().allow(null, '').optional(),
  deliveryAddress: Joi.string().min(1).max(500).optional(),
  totalAmount: Joi.number().positive().precision(2).optional(),
  language: Joi.string().valid('FR', 'AR', 'EN').optional(),
  serviceType: Joi.string().min(1).max(100).optional(),
  notes: Joi.string().max(1000).allow(null, '').optional(),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(ORDER_STATUS))
    .required()
    .messages({
      'any.only': 'Invalid status value',
      'any.required': 'Status is required',
    }),
  reason: Joi.string().max(500).allow(null, '').optional(),
});

const voiceCallbackSchema = Joi.object({
  intent: Joi.string().valid('CONFIRM', 'DECLINE', 'MODIFY').required()
    .messages({
      'any.only': 'Intent must be CONFIRM, DECLINE, or MODIFY',
      'any.required': 'Intent is required',
    }),
  transcript: Joi.string().min(1).max(2000).required()
    .messages({
      'string.empty': 'Transcript is required',
      'any.required': 'Transcript is required',
    }),
});

// ============================================================
// EXPORT VALIDATION MIDDLEWARE
// ============================================================

module.exports = {
  validateCreateOrder: validate(createOrderSchema),
  validateUpdateOrder: validate(updateOrderSchema),
  validateUpdateStatus: validate(updateStatusSchema),
  validateVoiceCallback: validate(voiceCallbackSchema),
};