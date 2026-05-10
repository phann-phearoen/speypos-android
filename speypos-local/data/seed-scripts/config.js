// This file defines which database tables are considered "seedable data".
// It excludes configuration tables (e.g., settings, staff, stores) and
// transactional tables (e.g., orders, shifts, payments) to avoid conflicts
// during the setup and seeding process.

export const SEEDABLE_TABLES = [
  'MenuCategory',
  'MenuItem',
  'MenuItemCategoryMap',
  'CustomizationOptionGroup',
  'CustomizationOption',
  'MenuItemCustomizationGroup',
  'ToppingGroup',
  'ToppingOption',
  'MenuItemToppingGroup',
  'MenuCategoryToppingGroup'
];
