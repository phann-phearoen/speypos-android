import { getMappingsByItemIds } from '../storage/repositories/menu-item-category-map.repo.js';

/**
 * Serializes a list of menu items to include their category IDs.
 * This is optimized to prevent N+1 queries.
 * @param {Array<object>} menuItems - The raw menu item objects from the repository.
 * @returns {Array<object>} The serialized menu item objects.
 */
export function serializeManyMenuItems(menuItems) {
  if (!menuItems || menuItems.length === 0) {
    return [];
  }

  const itemIds = menuItems.map(item => item.id);
  const mappings = getMappingsByItemIds(itemIds);

  // Create a map for efficient lookup: { menuItemId: [categoryId1, categoryId2] }
  const categoryMap = {};
  for (const mapping of mappings) {
    if (!categoryMap[mapping.menu_item_id]) {
      categoryMap[mapping.menu_item_id] = [];
    }
    categoryMap[mapping.menu_item_id].push(mapping.menu_category_id);
  }

  // Attach the category_ids to each menu item
  return menuItems.map(item => ({
    ...item,
    category_ids: categoryMap[item.id] || [],
  }));
}

/**
 * Serializes a single menu item to include its category IDs.
 * @param {object} menuItem - The raw menu item object.
 * @returns {object} The serialized menu item object.
 */
export function serializeMenuItem(menuItem) {
  if (!menuItem) {
    return null;
  }
  // This can be done by calling the 'many' serializer with a single item array
  const [serialized] = serializeManyMenuItems([menuItem]);
  return serialized;
}
