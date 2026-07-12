const orderRepository = require('../repositories/orderRepository');
const statusHistoryRepository = require('../repositories/statusHistoryRepository');
const { ORDER_STATUS, isValidTransition } = require('../constants/orderStatuses');
const { NotFoundError, BadRequestError } = require('../utils/errors');
const { notifySmsService,notifyVoiceService } = require('./notificationService');
const { ORDER_STATUS, FINAL_STATUSES, isValidTransition } = require('../constants/orderStatuses');
/**
 * OrderService — contains ALL business logic for orders.
 * 
 * Responsibilities:
 * - Create orders with initial status and items
 * - Validate status transitions using the state machine
 * - Record every status change in history
 * - Emit events to coordinate with other modules
 * - Handle voice callbacks from the AI Voice module
 */
class OrderService {
    /**
     * Create a new order.
     * Steps:
     * 1. Create the order in the database with status PENDING
     * 2. Create initial status history record
     * 3. Emit order.created event
     * 4. Notify SMS/Email module
     * 
     * @param {Object} data - Order creation data
     * @returns {Promise<Object>} Created order
     */
    async createOrder(data) {
        const orderData = {
            ...data,
            status: ORDER_STATUS.PENDING,
        };

        // Create order with items
        const order = await orderRepository.create(orderData);

        // Record initial status in history
        await statusHistoryRepository.create({
            orderId: order.id,
            previousStatus: ORDER_STATUS.PENDING,
            newStatus: ORDER_STATUS.PENDING,
            reason: 'Order created',
        });

        // Notify teammate modules (non-blocking)
        await notifySmsService(order);

        return order;
    }

    /**
     * Retrieve all orders.
     * @returns {Promise<Array>} All orders with items
     */
    async getAllOrders() {
        return orderRepository.findAll();
    }

    /**
     * Retrieve a single order by ID.
     * @param {string} id - Order UUID
     * @returns {Promise<Object>} Order with items
     * @throws {NotFoundError} If order doesn't exist
     */
    async getOrderById(id) {
        const order = await orderRepository.findById(id);
        if (!order) {
            throw new NotFoundError('Order not found');
        }
        return order;
    }

    /**
     * Update an order's information (NOT status).
     * Status updates must go through updateOrderStatus.
     * 
     * @param {string} id - Order UUID
     * @param {Object} data - Fields to update
     * @returns {Promise<Object>} Updated order
     * @throws {NotFoundError} If order doesn't exist
     * @throws {BadRequestError} If order is in a final status
     */
    async updateOrder(id, data) {
        const existingOrder = await orderRepository.findById(id);
        if (!existingOrder) {
            throw new NotFoundError('Order not found');
        }

        // Prevent editing finalized orders
        const FINAL_STATUSES = [ORDER_STATUS.CONFIRMED, ORDER_STATUS.REJECTED];
        if (FINAL_STATUSES.includes(existingOrder.status)) {
            throw new BadRequestError(`Cannot edit an order that is ${existingOrder.status}`);
        }

        // Remove fields that should not be updated through this method
        const { status, items, ...updateData } = data;

        return orderRepository.update(id, updateData);
    }

    /**
     * Delete an order and its associated data.
     * @param {string} id - Order UUID
     * @returns {Promise<Object>} Deleted order
     * @throws {NotFoundError} If order doesn't exist
     */
    async deleteOrder(id) {
        const existingOrder = await orderRepository.findById(id);
        if (!existingOrder) {
            throw new NotFoundError('Order not found');
        }

        return orderRepository.delete(id);
    }

    /**
     * Update an order's status using the state machine.
     * 
     * Steps:
     * 1. Find the order
     * 2. Validate the transition
     * 3. Update the status
     * 4. Record history
     * 5. Emit event
     * 6. Notify voice service if entering confirmation state
     * 
     * @param {string} id - Order UUID
     * @param {string} newStatus - Requested new status
     * @param {string} reason - Optional reason for the change
     * @returns {Promise<Object>} Updated order
     * @throws {NotFoundError} If order doesn't exist
     * @throws {BadRequestError} If transition is invalid
     */
    async updateOrderStatus(id, newStatus, reason) {
        const order = await orderRepository.findById(id);
        if (!order) {
            throw new NotFoundError('Order not found');
        }

        const currentStatus = order.status;

        // Validate the state machine transition
        if (!isValidTransition(currentStatus, newStatus)) {
            throw new BadRequestError(
                `Invalid status transition from ${currentStatus} to ${newStatus}`
            );
        }

        // If same status, nothing to do
        if (currentStatus === newStatus) {
            return order;
        }

        // Update the order status
        const updatedOrder = await orderRepository.updateStatus(id, newStatus);

        // Record the transition in history
        await statusHistoryRepository.create({
            orderId: id,
            previousStatus: currentStatus,
            newStatus,
            reason: reason || null,
        });


        // If we just moved to CONTACT_IN_PROGRESS, notify the voice service
        if (newStatus === ORDER_STATUS.CONTACT_IN_PROGRESS) {
           
            await notifyVoiceService(updatedOrder);
        }

        return updatedOrder;
    }

    /**
     * Get the complete status history of an order.
     * @param {string} id - Order UUID
     * @returns {Promise<Array>} Status history records
     * @throws {NotFoundError} If order doesn't exist
     */
    async getOrderHistory(id) {
        const order = await orderRepository.findById(id);
        if (!order) {
            throw new NotFoundError('Order not found');
        }

        return statusHistoryRepository.findByOrderId(id);
    }

    /**
     * Process a voice callback from the AI Voice module.
     * 
     * Maps the voice intent to a status and updates the order:
     * - CONFIRM → CONFIRMED
     * - DECLINE → REJECTED
     * - MODIFY → CHANGE_REQUESTED
     * 
     * @param {string} id - Order UUID
     * @param {string} intent - The customer's voice response intent
     * @param {string} transcript - The full voice transcript
     * @returns {Promise<Object>} Updated order
     */
    async processVoiceCallback(id, intent, transcript) {
        const order = await orderRepository.findById(id);
        if (!order) {
            throw new NotFoundError('Order not found');
        }

        // Map intent to status
        const VOICE_INTENT_TO_STATUS = {
            CONFIRM: ORDER_STATUS.CONFIRMED,
            DECLINE: ORDER_STATUS.REJECTED,
            MODIFY: ORDER_STATUS.CHANGE_REQUESTED,
        };

        const newStatus = VOICE_INTENT_TO_STATUS[intent];
        if (!newStatus) {
            throw new BadRequestError(`Unknown voice intent: ${intent}`);
        }

        // Use the main status update method (validates transition automatically)
        return this.updateOrderStatus(
            id,
            newStatus,
            `Voice callback: ${intent} — "${transcript}"`
        );
    }

    /**
     * Manually start the confirmation process for an order.
     * Moves order from PENDING to CONTACT_IN_PROGRESS.
     * This would typically be triggered by a frontend action or timer.
     * 
     * @param {string} id - Order UUID
     * @returns {Promise<Object>} Updated order
     */
    async startConfirmationProcess(id) {
        return this.updateOrderStatus(
            id,
            ORDER_STATUS.CONTACT_IN_PROGRESS,
            'Confirmation process started'
        );
    }
}

module.exports = new OrderService();