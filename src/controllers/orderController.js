const orderService = require('../services/orderService');
const { sendSuccess } = require('../utils/response');

/**
 * OrderController — handles HTTP requests for order operations.
 * 
 * Responsibilities:
 * - Extract data from request (body, params, query)
 * - Call the appropriate service method
 * - Return formatted HTTP response
 * - Forward errors to the global error handler
 * 
 * Controllers do NOT:
 * - Access the database
 * - Implement business rules
 * - Handle validation (done by middleware)
 */
class OrderController {
  /**
   * POST /orders
   * Create a new order.
   */
  async createOrder(req, res, next) {
    try {
      const order = await orderService.createOrder(req.body);
      sendSuccess(res, order, 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /orders
   * Retrieve all orders.
   */
  async getAllOrders(req, res, next) {
    try {
      const orders = await orderService.getAllOrders();
      sendSuccess(res, orders);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /orders/:id
   * Retrieve a single order by ID.
   */
  async getOrderById(req, res, next) {
    try {
      const order = await orderService.getOrderById(req.params.id);
      sendSuccess(res, order);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /orders/:id
   * Update an order's information (not status).
   */
  async updateOrder(req, res, next) {
    try {
      const order = await orderService.updateOrder(req.params.id, req.body);
      sendSuccess(res, order);
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /orders/:id
   * Delete an order.
   */
  async deleteOrder(req, res, next) {
    try {
      await orderService.deleteOrder(req.params.id);
      sendSuccess(res, { message: 'Order deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /orders/:id/status
   * Update an order's status using the state machine.
   */
  async updateStatus(req, res, next) {
    try {
      const { status, reason } = req.body;
      const order = await orderService.updateOrderStatus(
        req.params.id,
        status,
        reason
      );
      sendSuccess(res, order);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /orders/:id/history
   * Retrieve the status history of an order.
   */
  async getOrderHistory(req, res, next) {
    try {
      const history = await orderService.getOrderHistory(req.params.id);
      sendSuccess(res, history);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /orders/:id/callbacks/voice
   * Receive voice callback from AI Voice module.
   */
  async voiceCallback(req, res, next) {
    try {
      const { intent, transcript } = req.body;
      const order = await orderService.processVoiceCallback(
        req.params.id,
        intent,
        transcript
      );
      sendSuccess(res, order);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /orders/:id/start-confirmation
   * Manually start the confirmation process for an order.
   */
  async startConfirmation(req, res, next) {
    try {
      const order = await orderService.startConfirmationProcess(req.params.id);
      sendSuccess(res, order);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new OrderController();