const { isValidTransition } = require('../src/constants/orderStatuses');

describe('isValidTransition (unit)', () => {
  test('allows a legal transition', () => {
    expect(isValidTransition('PENDING', 'CONTACT_IN_PROGRESS')).toBe(true);
  });

  test('rejects an illegal transition', () => {
    expect(isValidTransition('PENDING', 'CONFIRMED')).toBe(false);
  });

  test('allows every documented legal transition, including the ones no integration test covers', () => {
    expect(isValidTransition('CONTACT_IN_PROGRESS', 'UNREACHABLE')).toBe(true);
    expect(isValidTransition('WAITING_FOR_CUSTOMER_CONFIRMATION', 'CHANGE_REQUESTED')).toBe(true);
    expect(isValidTransition('WAITING_FOR_CUSTOMER_CONFIRMATION', 'UNREACHABLE')).toBe(true);
    expect(isValidTransition('CHANGE_REQUESTED', 'CONTACT_IN_PROGRESS')).toBe(true);
  });

  test('treats a same-status "change" as valid (no-op)', () => {
    expect(isValidTransition('PENDING', 'PENDING')).toBe(true);
  });

  test('rejects missing or undefined input defensively', () => {
    expect(isValidTransition(undefined, 'PENDING')).toBe(false);
    expect(isValidTransition('PENDING', undefined)).toBe(false);
    expect(isValidTransition(null, null)).toBe(false);
  });

  test('rejects an unrecognized current status', () => {
    expect(isValidTransition('NOT_A_REAL_STATUS', 'PENDING')).toBe(false);
  });
});