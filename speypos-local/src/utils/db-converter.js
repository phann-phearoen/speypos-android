/**
 * Converts boolean values to integers (1 for true, 0 for false) for specified fields in an object.
 * This prepares a data object for insertion or update into a database that uses integers for booleans.
 *
 * @param {object} data The data object to process.
 * @param {Array<string>} booleanFields An array of keys that should be converted from boolean to integer.
 * @returns {object} A new object with boolean values converted to integers.
 */
export function toDb(data, booleanFields) {
  const convertedData = { ...data };
  for (const field of booleanFields) {
    if (Object.prototype.hasOwnProperty.call(convertedData, field)) {
      convertedData[field] = convertedData[field] === true ? 1 : 0;
    }
  }
  return convertedData;
}

/**
 * Converts integer values (1 or 0) to booleans for specified fields in an object or an array of objects.
 * This transforms database results into a more JavaScript-friendly format.
 *
 * @param {object|Array<object>} result The database result (or results) to process.
 * @param {Array<string>} booleanFields An array of keys that should be converted from integer to boolean.
 * @returns {object|Array<object>} The processed result(s) with integers converted to booleans.
 */
export function fromDb(result, booleanFields) {
  if (!result) {
    return result;
  }

  if (Array.isArray(result)) {
    return result.map((item) => convertItemFromDb(item, booleanFields));
  }

  return convertItemFromDb(result, booleanFields);
}

/**
 * Helper function to convert a single item.
 * @param {object} item The object to convert.
 * @param {Array<string>} booleanFields The fields to convert.
 * @returns {object} The converted object.
 */
function convertItemFromDb(item, booleanFields) {
  const convertedItem = { ...item };
  for (const field of booleanFields) {
    if (Object.prototype.hasOwnProperty.call(convertedItem, field)) {
      convertedItem[field] = convertedItem[field] === 1;
    }
  }
  return convertedItem;
}
