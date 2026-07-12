const prisma = require('../config/prisma');

/**
 * OrderRepository — handles all database operations for orders.
 * This is the ONLY file that interacts with the Order model via Prisma.
 */
class OrderRepository {
  /**
   * Create a new order with its items.
   * @param {Object} data - Order data including items array
   * @returns {Promise<Object>} Created order with items
   */
  async create(data) {
    const { items, ...orderData } = data;

    return prisma.order.create({
      data: {
        ...orderData,
        items: {
          create: items,
        },
      },
      include: {
        items: true,
      },
    });
  }

  /**
   * Find all orders, most recent first.
   * @returns {Promise<Array>} List of orders with items
   */
  async findAll() {
    return prisma.order.findMany({
      include: {
        items: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Find a single order by its UUID.
   * @param {string} id - Order UUID
   * @returns {Promise<Object|null>} Order with items, or null
   */
  async findById(id) {
    return prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });
  }

  /**
   * Find a single order by its order number.
   * @param {string} orderNumber - Human-readable order number
   * @returns {Promise<Object|null>} Order, or null
   */
  async findByOrderNumber(orderNumber) {
    return prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: true,
      },
    });
  }

  /**
   * Update an order's fields (not status).
   * @param {string} id - Order UUID
   * @param {Object} data - Fields to update
   * @returns {Promise<Object>} Updated order with items
   */
  async update(id, data) {
    return prisma.order.update({
      where: { id },
      data,
      include: {
        items: true,
      },
    });
  }

  /**
   * Update only the order status.
   * @param {string} id - Order UUID
   * @param {string} status - New status value
   * @returns {Promise<Object>} Updated order with items
   */
  async updateStatus(id, status) {
    return prisma.order.update({
      where: { id },
      data: { status },
      include: {
        items: true,
      },
    });
  }

  /**
   * Delete an order (cascades to items and status history).
   * @param {string} id - Order UUID
   * @returns {Promise<Object>} Deleted order
   */
  async delete(id) {
    return prisma.order.delete({
      where: { id },
      include: {
        items: true,
      },
    });
  }
}

module.exports = new OrderRepository();