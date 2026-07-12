const express = require('express');
const orderController = require('../controllers/orderController');
const { validateCreateOrder, validateUpdateOrder, validateUpdateStatus, validateVoiceCallback } = require('../middleware/validate');

const router = express.Router();

/**
 * @openapi
 * /api/v1/orders:
 *   post:
 *     summary: Create a new order
 *     description: Creates a new order with items. Initial status is PENDING.
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOrderRequest'
 *     responses:
 *       201:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderResponse'
 *       422:
 *         description: Validation failed
 *       500:
 *         description: Internal server error
 */
router.post('/', validateCreateOrder, orderController.createOrder);

/**
 * @openapi
 * /api/v1/orders:
 *   get:
 *     summary: Retrieve all orders
 *     description: Returns a list of all orders with their items, most recent first.
 *     tags: [Orders]
 *     responses:
 *       200:
 *         description: List of orders
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrdersListResponse'
 */
router.get('/', orderController.getAllOrders);

/**
 * @openapi
 * /api/v1/orders/{id}:
 *   get:
 *     summary: Retrieve a single order
 *     description: Returns the details of one order including its items.
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order UUID
 *     responses:
 *       200:
 *         description: Order details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderResponse'
 *       404:
 *         description: Order not found
 */
router.get('/:id', orderController.getOrderById);

/**
 * @openapi
 * /api/v1/orders/{id}:
 *   put:
 *     summary: Update an order
 *     description: Updates editable order fields. Does NOT modify status.
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateOrderRequest'
 *     responses:
 *       200:
 *         description: Order updated
 *       404:
 *         description: Order not found
 *       400:
 *         description: Cannot edit finalized order
 */
router.put('/:id', validateUpdateOrder, orderController.updateOrder);

/**
 * @openapi
 * /api/v1/orders/{id}:
 *   delete:
 *     summary: Delete an order
 *     description: Deletes an order and its associated items.
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Order deleted
 *       404:
 *         description: Order not found
 */
router.delete('/:id', orderController.deleteOrder);

/**
 * @openapi
 * /api/v1/orders/{id}/status:
 *   patch:
 *     summary: Update order status
 *     description: Updates the order status using the state machine. Invalid transitions are rejected.
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateStatusRequest'
 *     responses:
 *       200:
 *         description: Status updated
 *       400:
 *         description: Invalid status transition
 *       404:
 *         description: Order not found
 */
router.patch('/:id/status', validateUpdateStatus, orderController.updateStatus);

/**
 * @openapi
 * /api/v1/orders/{id}/history:
 *   get:
 *     summary: Retrieve order status history
 *     description: Returns the complete status history audit trail for an order.
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Status history list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatusHistoryListResponse'
 */
router.get('/:id/history', orderController.getOrderHistory);

/**
 * @openapi
 * /api/v1/orders/{id}/callbacks/voice:
 *   post:
 *     summary: AI Voice callback
 *     description: Receives the result from the AI Voice module after customer interaction.
 *     tags: [Callbacks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VoiceCallbackRequest'
 *     responses:
 *       200:
 *         description: Status updated based on voice intent
 *       400:
 *         description: Unknown intent or invalid transition
 *       404:
 *         description: Order not found
 */
router.post('/:id/callbacks/voice', validateVoiceCallback, orderController.voiceCallback);

/**
 * @openapi
 * /api/v1/orders/{id}/start-confirmation:
 *   post:
 *     summary: Start confirmation process
 *     description: Manually moves an order from PENDING to CONTACT_IN_PROGRESS.
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Confirmation process started
 *       400:
 *         description: Invalid transition
 *       404:
 *         description: Order not found
 */
router.post('/:id/start-confirmation', orderController.startConfirmation);

module.exports = router;