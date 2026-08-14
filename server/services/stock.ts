import { db } from '../db/store';
import crypto from 'crypto';

export interface StockDeductionResult {
  cogs_total: number;
  deducted_items: {
    item_type: 'ingredient' | 'product';
    item_id: string;
    item_name: string;
    quantity: number;
    unit: string;
    cost: number;
  }[];
  low_stock_alerts: string[];
}

export function deductStockForOrder(order: any, branch_id: string, user_id?: string): StockDeductionResult {
  const stockBranches = db.get('stock_branch');
  const ingredients = db.get('ingredients');
  const products = db.get('products');
  const productVariants = db.get('product_variants');
  const productRecipes = db.get('product_recipes');
  const productModifiers = db.get('product_modifiers');

  let cogs_total = 0;
  const deducted_items: StockDeductionResult['deducted_items'] = [];
  const low_stock_alerts: string[] = [];

  for (const item of order.items) {
    const product = products.find((p: any) => p.id === item.product_id);
    if (!product || !product.track_stock) continue;

    const variant = item.variant_id ? productVariants.find((v: any) => v.id === item.variant_id) : null;
    const variantMultiplier = variant?.recipe_multiplier || 1.0;

    if (!product.is_recipe_based) {
      // Simple product: deduct product directly
      const qty = item.quantity;
      const unitCost = product.cost_price || 0;
      const totalCost = unitCost * qty;
      cogs_total += totalCost;

      let branchStock = stockBranches.find((s: any) => s.branch_id === branch_id && s.item_type === 'product' && s.item_id === product.id);
      if (!branchStock) {
        branchStock = {
          id: `stk-${crypto.randomUUID()}`,
          branch_id,
          item_type: 'product',
          item_id: product.id,
          current_stock: 0,
          min_stock_alert: 10,
        };
        db.insert('stock_branch', branchStock);
      }

      branchStock.current_stock -= qty;
      branchStock.last_updated = new Date().toISOString();

      if (branchStock.current_stock <= branchStock.min_stock_alert) {
        low_stock_alerts.push(`Stok ${product.name} menipis! Sisa ${branchStock.current_stock} pcs`);
      }

      // Record movement
      db.insert('stock_movements', {
        id: `mov-${crypto.randomUUID()}`,
        branch_id,
        item_type: 'product',
        item_id: product.id,
        movement_type: 'sales_cogs',
        quantity: -qty,
        unit: 'pcs',
        unit_cost: unitCost,
        total_cost: totalCost,
        reference_id: order.order_number,
        notes: `Penjualan ${qty}x ${product.name} (Order: ${order.order_number})`,
        created_by: user_id || 'system',
        created_at: new Date().toISOString(),
      });

      deducted_items.push({
        item_type: 'product',
        item_id: product.id,
        item_name: product.name,
        quantity: qty,
        unit: 'pcs',
        cost: totalCost,
      });
    } else {
      // Recipe / BOM based: find recipes for this product
      const recipes = productRecipes.filter((r: any) => r.product_id === product.id && (!r.variant_id || r.variant_id === item.variant_id));

      for (const recipe of recipes) {
        const ingredient = ingredients.find((i: any) => i.id === recipe.ingredient_id);
        if (!ingredient) continue;

        const neededQty = recipe.quantity * variantMultiplier * item.quantity;
        const ingUnitCost = ingredient.cost_per_unit || 0;
        const totalIngCost = neededQty * ingUnitCost;
        cogs_total += totalIngCost;

        let branchStock = stockBranches.find((s: any) => s.branch_id === branch_id && s.item_type === 'ingredient' && s.item_id === ingredient.id);
        if (!branchStock) {
          branchStock = {
            id: `stk-${crypto.randomUUID()}`,
            branch_id,
            item_type: 'ingredient',
            item_id: ingredient.id,
            current_stock: 0,
            min_stock_alert: ingredient.min_stock_alert || 100,
          };
          db.insert('stock_branch', branchStock);
        }

        branchStock.current_stock -= neededQty;
        branchStock.last_updated = new Date().toISOString();

        if (branchStock.current_stock <= branchStock.min_stock_alert) {
          low_stock_alerts.push(`Bahan baku ${ingredient.name} di bawah batas minimum! Sisa: ${branchStock.current_stock} ${ingredient.base_unit}`);
        }

        db.insert('stock_movements', {
          id: `mov-${crypto.randomUUID()}`,
          branch_id,
          item_type: 'ingredient',
          item_id: ingredient.id,
          movement_type: 'sales_cogs',
          quantity: -neededQty,
          unit: ingredient.base_unit,
          unit_cost: ingUnitCost,
          total_cost: totalIngCost,
          reference_id: order.order_number,
          notes: `BOM Resep ${item.quantity}x ${product.name} (Order: ${order.order_number})`,
          created_by: user_id || 'system',
          created_at: new Date().toISOString(),
        });

        deducted_items.push({
          item_type: 'ingredient',
          item_id: ingredient.id,
          item_name: ingredient.name,
          quantity: neededQty,
          unit: ingredient.base_unit,
          cost: totalIngCost,
        });
      }

      // Check modifiers
      if (item.modifiers && Array.isArray(item.modifiers)) {
        for (const mod of item.modifiers) {
          if (mod.ingredient_id && mod.ingredient_qty) {
            const ing = ingredients.find((i: any) => i.id === mod.ingredient_id);
            if (ing) {
              const modQty = mod.ingredient_qty * item.quantity;
              const modCost = (ing.cost_per_unit || 0) * modQty;
              cogs_total += modCost;

              const branchStock = stockBranches.find((s: any) => s.branch_id === branch_id && s.item_type === 'ingredient' && s.item_id === ing.id);
              if (branchStock) {
                branchStock.current_stock -= modQty;
                branchStock.last_updated = new Date().toISOString();
              }

              db.insert('stock_movements', {
                id: `mov-${crypto.randomUUID()}`,
                branch_id,
                item_type: 'ingredient',
                item_id: ing.id,
                movement_type: 'sales_cogs',
                quantity: -modQty,
                unit: ing.base_unit,
                unit_cost: ing.cost_per_unit,
                total_cost: modCost,
                reference_id: order.order_number,
                notes: `Modifier ${mod.name} pada ${product.name} (Order: ${order.order_number})`,
                created_by: user_id || 'system',
                created_at: new Date().toISOString(),
              });
            }
          }
        }
      }
    }
  }

  db.set('stock_branch', stockBranches);

  return { cogs_total, deducted_items, low_stock_alerts };
}

export function restoreStockForOrder(order: any, branch_id: string, reason: string, user_id?: string) {
  // Reverses stock movement by recording an opposing movement
  const stockMovements = db.get('stock_movements');
  const pastMovements = stockMovements.filter((m: any) => m.reference_id === order.order_number && m.movement_type === 'sales_cogs');
  const stockBranches = db.get('stock_branch');

  for (const mov of pastMovements) {
    const qtyToRestore = Math.abs(mov.quantity);
    const branchStock = stockBranches.find((s: any) => s.branch_id === branch_id && s.item_type === mov.item_type && s.item_id === mov.item_id);
    if (branchStock) {
      branchStock.current_stock += qtyToRestore;
      branchStock.last_updated = new Date().toISOString();
    }

    db.insert('stock_movements', {
      id: `mov-${crypto.randomUUID()}`,
      branch_id,
      item_type: mov.item_type,
      item_id: mov.item_id,
      movement_type: 'opname_adjustment',
      quantity: qtyToRestore,
      unit: mov.unit,
      unit_cost: mov.unit_cost,
      total_cost: mov.total_cost,
      reference_id: `VOID-${order.order_number}`,
      notes: `Restorasi stok karena Void Order ${order.order_number}: ${reason}`,
      created_by: user_id || 'system',
      created_at: new Date().toISOString(),
    });
  }

  db.set('stock_branch', stockBranches);
}
