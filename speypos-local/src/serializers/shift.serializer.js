import { getStaffShiftMaps } from '../storage/repositories/staff-shift.repo.js';
import { getStaffById } from '../storage/repositories/staff.repo.js';

/**
 * Serializes a list of shifts to include their associated staff IDs.
 * This is optimized to prevent N+1 queries.
 * @param {Array<object>} shifts - The raw shift objects from the repository.
 * @returns {Array<object>} The serialized shift objects.
 */
export function serializeManyShifts(shifts) {
  if (!shifts || shifts.length === 0) {
    return [];
  }

  const shiftIds = shifts.map(shift => shift.id);
  
  // Fetch all relevant staff-shift mappings in one go.
  const mappings = getStaffShiftMaps({ shift_id: shiftIds });

  // Create a map for efficient lookup: { shiftId: [staffId1, staffId2] }
  // Although it's one-to-one in this logic, the repo function can return many.
  const staffMap = {};
  for (const mapping of mappings) {
    if (!staffMap[mapping.shift_id]) {
      staffMap[mapping.shift_id] = [];
    }
    const staff = getStaffById(mapping.staff_id);
    staffMap[mapping.shift_id].push(staff);
  }

  // Attach the staff_ids to each shift item
  return shifts.map(shift => ({
    ...shift,
    // Assuming one staff per shift as per current logic, but can be extended.
    staff_id: staffMap[shift.id] ? staffMap[shift.id][0]?.id : null,
    staff: staffMap[shift.id][0] || {},
  }));
}

/**
 * Serializes a single shift to include its associated staff ID.
 * @param {object} shift - The raw shift object.
 * @returns {object} The serialized shift object.
 */
export function serializeShift(shift) {
  if (!shift) {
    return null;
  }
  // This can be done by calling the 'many' serializer with a single item array
  const [serialized] = serializeManyShifts([shift]);
  return serialized;
}
