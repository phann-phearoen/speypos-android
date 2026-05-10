import { getDb } from '../storage/database.js';

/**
 * Serializes a full order with related entities into the expected nested shape.
 * Fetches associated data (staff, items, customizations, toppings, payments).
 * @param {object} order - Raw order row.
 * @returns {object | undefined} Serialized order or undefined if order is falsy.
 */
export function serializeOrder(order) {
  if (!order) {
    return undefined;
  }

  const db = getDb();

  const staff = order.staff_id
    ? db.prepare('SELECT id, name FROM Staff WHERE id = ?').get(order.staff_id)
    : null;

  const voidedByStaff = order.voided_by
    ? db.prepare('SELECT id, name FROM Staff WHERE id = ?').get(order.voided_by)
    : null;

  const items = db
    .prepare(
      `
      SELECT oi.*, mi.name as menu_item_name
      FROM OrderItem oi
      JOIN MenuItem mi ON oi.menu_item_id = mi.id
      WHERE oi.order_id = ?
    `
    )
    .all(order.id);

  const customizations = db
    .prepare(
      `
      SELECT oc.*
      FROM OrderCustomization oc
      JOIN OrderItem oi ON oc.order_item_id = oi.id
      WHERE oi.order_id = ?
    `
    )
    .all(order.id);

  const toppings = db
    .prepare(
      `
      SELECT oit.*
      FROM OrderItemTopping oit
      JOIN OrderItem oi ON oit.order_item_id = oi.id
      WHERE oi.order_id = ?
    `
    )
    .all(order.id);

  const payments = db.prepare('SELECT * FROM Payment WHERE order_id = ?').all(order.id);

  const customizationsByItem = new Map();
  for (const customization of customizations) {
    const list = customizationsByItem.get(customization.order_item_id) || [];
    list.push(customization);
    customizationsByItem.set(customization.order_item_id, list);
  }

  const toppingsByItem = new Map();
  for (const topping of toppings) {
    const list = toppingsByItem.get(topping.order_item_id) || [];
    list.push(topping);
    toppingsByItem.set(topping.order_item_id, list);
  }

  const serializedItems = items.map((item) => ({
    ...item,
    customizations: customizationsByItem.get(item.id) || [],
    toppings: toppingsByItem.get(item.id) || [],
  }));

  return {
    ...order,
    staff: staff || (order.staff_id ? { id: order.staff_id, name: null } : null),
    voided_by_staff:
      voidedByStaff || (order.voided_by ? { id: order.voided_by, name: null } : null),
    items: serializedItems,
    payments,
  };
}
