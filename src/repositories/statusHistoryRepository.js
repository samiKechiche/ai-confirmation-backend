const prisma = require('../config/prisma');

/**
 * StatusHistoryRepository — handles all database operations for status history.
 * Every status change creates a record here for audit purposes.
 */
class StatusHistoryRepository {
  /**
   * Create a status history record.
   * @param {Object} data - { orderId, previousStatus, newStatus, reason }
   * @returns {Promise<Object>} Created history record
   */
  async create(data) {
    return prisma.statusHistory.create({
      data,
    });
  }

  /**
   * Find all history records for a specific order.
   * @param {string} orderId - Order UUID
   * @returns {Promise<Array>} Status history records, oldest first
   */
  async findByOrderId(orderId) {
    return prisma.statusHistory.findMany({
      where: { orderId },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }
}

module.exports = new StatusHistoryRepository();