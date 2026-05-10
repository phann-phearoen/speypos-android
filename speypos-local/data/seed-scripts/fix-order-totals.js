import Database from 'better-sqlite3';
import fs from 'fs';
import { paths } from '../../src/config/paths.js';

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function getArgValue(name) {
  const arg = process.argv.find((value) => value.startsWith(`${name}=`));
  if (!arg) return null;
  return arg.split('=')[1];
}

function buildAddOnTotals(customizations, toppings) {
  const totals = new Map();

  for (const customization of customizations) {
    const current = totals.get(customization.order_item_id) || 0;
    totals.set(customization.order_item_id, current + (customization.price || 0));
  }

  for (const topping of toppings) {
    const current = totals.get(topping.order_item_id) || 0;
    const unitPrice = topping.unit_price || 0;
    const quantity = topping.quantity || 0;
    const lineTotal = topping.total_price ?? unitPrice * quantity;
    totals.set(topping.order_item_id, current + lineTotal);
  }

  return totals;
}

function main() {
  const dryRun = hasFlag('--dry-run');
  const maxPreview = Number(getArgValue('--preview') || 20);

  const dbPath = paths.db.path;
  if (!fs.existsSync(dbPath)) {
    console.error(`Database not found at ${dbPath}. Start the app once to create it.`);
    process.exit(1);
  }

  const db = new Database(dbPath);

  try {
    const orders = db
      .prepare('SELECT id, total_amount FROM "Order"')
      .all();

    const items = db
      .prepare('SELECT id, order_id, quantity, unit_price FROM OrderItem')
      .all();

    const customizations = db
      .prepare('SELECT order_item_id, price FROM OrderCustomization')
      .all();

    const toppings = db
      .prepare('SELECT order_item_id, unit_price, quantity, total_price FROM OrderItemTopping')
      .all();

    const addOnTotals = buildAddOnTotals(customizations, toppings);
    const itemsByOrder = new Map();

    for (const item of items) {
      const list = itemsByOrder.get(item.order_id) || [];
      list.push(item);
      itemsByOrder.set(item.order_id, list);
    }

    const updates = [];
    for (const order of orders) {
      const orderItems = itemsByOrder.get(order.id) || [];
      let correctedTotal = 0;
      let addOnTotal = 0;

      for (const item of orderItems) {
        correctedTotal += item.unit_price * item.quantity;
        addOnTotal += addOnTotals.get(item.id) || 0;
      }

      if (order.total_amount !== correctedTotal) {
        updates.push({
          id: order.id,
          oldTotal: order.total_amount,
          newTotal: correctedTotal,
          addOnTotal,
        });
      }
    }

    if (updates.length === 0) {
      console.log('No orders require total_amount updates.');
      return;
    }

    console.log(`Orders requiring update: ${updates.length}`);

    const previewCount = Math.min(updates.length, maxPreview);
    for (let i = 0; i < previewCount; i += 1) {
      const { id, oldTotal, newTotal, addOnTotal } = updates[i];
      console.log(
        `${id}: ${oldTotal} -> ${newTotal} (add-ons: ${addOnTotal})`
      );
    }

    if (dryRun) {
      console.log('Dry run enabled. No data was modified.');
      return;
    }

    const updateStmt = db.prepare('UPDATE "Order" SET total_amount = ? WHERE id = ?');
    const updateTransaction = db.transaction((rows) => {
      for (const row of rows) {
        updateStmt.run(row.newTotal, row.id);
      }
    });

    updateTransaction(updates);

    console.log('Order totals updated successfully.');
  } catch (error) {
    console.error(`Failed to update order totals: ${error.message}`);
    process.exitCode = 1;
  } finally {
    if (db.open) {
      db.close();
    }
  }
}

main();
