/**
 * Order Status Enum Values
 * These are the ONLY valid status values in the system.
 */
const ORDER_STATUS = {
  PENDING: 'PENDING',
  CONTACT_IN_PROGRESS: 'CONTACT_IN_PROGRESS',
  WAITING_FOR_CUSTOMER_CONFIRMATION: 'WAITING_FOR_CUSTOMER_CONFIRMATION',
  CONFIRMED: 'CONFIRMED',
  REJECTED: 'REJECTED',
  CHANGE_REQUESTED: 'CHANGE_REQUESTED',
  UNREACHABLE: 'UNREACHABLE',
};

/**
 * VALID_TRANSITIONS defines which status changes are allowed.
 * The key is the CURRENT status.
 * The value array contains all VALID next statuses.
 * Empty array means the status is FINAL — no transitions allowed.
 */
const VALID_TRANSITIONS = {
  [ORDER_STATUS.PENDING]: [
    ORDER_STATUS.CONTACT_IN_PROGRESS,
  ],
  [ORDER_STATUS.CONTACT_IN_PROGRESS]: [
    ORDER_STATUS.WAITING_FOR_CUSTOMER_CONFIRMATION,
    ORDER_STATUS.UNREACHABLE,
  ],
  [ORDER_STATUS.WAITING_FOR_CUSTOMER_CONFIRMATION]: [
    ORDER_STATUS.CONFIRMED,
    ORDER_STATUS.REJECTED,
    ORDER_STATUS.CHANGE_REQUESTED,
    ORDER_STATUS.UNREACHABLE,
  ],
  [ORDER_STATUS.CHANGE_REQUESTED]: [
    ORDER_STATUS.CONTACT_IN_PROGRESS,
  ],
  [ORDER_STATUS.CONFIRMED]: [],
  [ORDER_STATUS.REJECTED]: [],
  [ORDER_STATUS.UNREACHABLE]: [],
};

/**
 * FINAL_STATUSES — orders in these states cannot change further.
 */
const FINAL_STATUSES = [
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.REJECTED,
  ORDER_STATUS.UNREACHABLE,
];

/**
 * Check if a status transition is valid.
 * @param {string} currentStatus - The order's current status
 * @param {string} newStatus - The requested new status
 * @returns {boolean} True if the transition is allowed
 */
function isValidTransition(currentStatus, newStatus) {
  if (!currentStatus || !newStatus) return false;
  if (currentStatus === newStatus) return true; // Same status is always "valid" (no-op)

  const allowedNextStatuses = VALID_TRANSITIONS[currentStatus];
  if (!allowedNextStatuses) return false;

  return allowedNextStatuses.includes(newStatus);
}

module.exports = {
  ORDER_STATUS,
  VALID_TRANSITIONS,
  FINAL_STATUSES,
  isValidTransition,
};