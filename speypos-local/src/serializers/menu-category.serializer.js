import * as customGroupRepo from '../storage/repositories/customization-option-group.repo.js';
import * as categoryCustomGroupRepo from '../storage/repositories/menu-category-customization-group.repo.js';
import * as toppingGroupRepo from '../storage/repositories/topping-group.repo.js';
import * as categoryToppingGroupRepo from '../storage/repositories/menu-category-topping-group.repo.js';

/**
 * Serializes a single menu category, embedding its associated customization groups.
 * @param {object} category - The raw menu category object from the database.
 * @returns {object} The serialized category with embedded data.
 */
export function serializeCategory(category) {
  if (!category) return null;

  // Find all mappings for this category
  const maps = categoryCustomGroupRepo.getMaps({ menu_category_id: category.id });
  const groupIds = maps.map(map => map.customization_group_id);

  // Fetch all customization groups in one go if there are any
  let customization_groups = [];
  if (groupIds.length > 0) {
    // This assumes the repo can handle fetching multiple IDs, which is more efficient.
    // If not, this would need to be a loop. Let's assume we can add/use a getByIds function.
    // For now, we'll loop, but this is an area for future optimization.
    customization_groups = groupIds.map(id => customGroupRepo.getById(id)).filter(Boolean);
  }

  const toppingMaps = categoryToppingGroupRepo.getMaps({ menu_category_id: category.id });
  const toppingGroupIds = toppingMaps.map(map => map.topping_group_id);

  let topping_groups = [];
  if (toppingGroupIds.length > 0) {
    topping_groups = toppingGroupIds.map(id => toppingGroupRepo.getById(id)).filter(Boolean);
  }

  return {
    ...category,
    customization_groups,
    topping_groups,
  };
}

/**
 * Serializes an array of menu categories.
 * @param {Array<object>} categories - An array of raw menu category objects.
 * @returns {Array<object>} The array of serialized categories.
 */
export function serializeCategories(categories) {
  if (!categories || !Array.isArray(categories)) return [];
  return categories.map(serializeCategory);
}
