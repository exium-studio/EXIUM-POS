import { Router } from 'express';
import { db } from '../db/store';
import crypto from 'crypto';

export const productsRouter = Router();

// Helper to recalculate HPP for a product based on its recipe ingredients
function calculateProductCostPrice(productId: string): number {
  const recipes = db.get('product_recipes').filter((r: any) => r.product_id === productId);
  const ingredients = db.get('ingredients');
  let totalCost = 0;

  for (const r of recipes) {
    const ing = ingredients.find((i: any) => i.id === r.ingredient_id);
    if (ing) {
      totalCost += (ing.cost_per_unit || 0) * (r.quantity || 0);
    }
  }

  return Math.round(totalCost);
}

// Get all products with variants, recipes, categories, and branch stock
productsRouter.get('/', (req, res) => {
  const branch_id = (req.query.branch_id as string) || 'branch-1';
  const products = (db.get('products') || []).filter((p: any) => p.is_deleted !== true);
  const categories = db.get('product_categories');
  const variants = db.get('product_variants');
  const recipes = db.get('product_recipes');
  const ingredients = db.get('ingredients');
  const stockBranches = db.get('stock_branch').filter((s: any) => s.branch_id === branch_id);

  const enriched = products.map((p: any) => {
    const category = categories.find((c: any) => c.id === p.category_id);
    const prodVariants = variants.filter((v: any) => v.product_id === p.id);
    const prodRecipes = recipes
      .filter((r: any) => r.product_id === p.id)
      .map((r: any) => {
        const ing = ingredients.find((i: any) => i.id === r.ingredient_id);
        return {
          ...r,
          ingredient_name: ing ? ing.name : 'Unknown Ingredient',
          ingredient_unit: ing ? ing.base_unit : 'unit',
          cost_per_unit: ing ? ing.cost_per_unit : 0,
        };
      });

    let stock_in_branch = 999;
    if (!p.is_recipe_based) {
      const branchStock = stockBranches.find((s: any) => s.item_type === 'product' && s.item_id === p.id);
      stock_in_branch = branchStock ? branchStock.current_stock : 0;
    } else {
      // Calculate max portions possible from limiting ingredient in branch
      if (prodRecipes.length > 0) {
        let minPortions = Infinity;
        for (const rec of prodRecipes) {
          const ingStock = stockBranches.find((s: any) => s.item_type === 'ingredient' && s.item_id === rec.ingredient_id);
          const currentIngQty = ingStock ? ingStock.current_stock : 0;
          const portions = rec.quantity > 0 ? Math.floor(currentIngQty / rec.quantity) : 999;
          if (portions < minPortions) minPortions = portions;
        }
        stock_in_branch = minPortions === Infinity ? 0 : Math.max(0, minPortions);
      }
    }

    return {
      ...p,
      category_name: category?.name,
      kitchen_station: category?.kitchen_station || 'food',
      cost_price: p.is_recipe_based ? calculateProductCostPrice(p.id) : p.cost_price,
      variants: prodVariants,
      recipes: prodRecipes,
      stock_in_branch,
    };
  });

  res.json(enriched);
});

// Categories
productsRouter.get('/categories', (req, res) => {
  const categories = db.get('product_categories');
  res.json(categories);
});

productsRouter.post('/categories', (req, res) => {
  const newCat = {
    id: `cat-${crypto.randomUUID()}`,
    name: req.body.name,
    slug: req.body.slug || req.body.name.toLowerCase().replace(/\s+/g, '-'),
    kitchen_station: req.body.kitchen_station || 'food',
    icon: req.body.icon || 'Coffee',
    sort_order: req.body.sort_order || 0,
  };
  db.insert('product_categories', newCat);
  res.json(newCat);
});

// Modifiers
productsRouter.get('/modifiers', (req, res) => {
  const modifiers = db.get('product_modifiers');
  res.json(modifiers);
});

productsRouter.post('/modifiers', (req, res) => {
  const newMod = {
    id: `mod-${crypto.randomUUID()}`,
    name: req.body.name,
    category: req.body.category || 'Umum',
    price: Number(req.body.price) || 0,
    ingredient_id: req.body.ingredient_id || null,
    ingredient_qty: Number(req.body.ingredient_qty) || 0,
  };
  db.insert('product_modifiers', newMod);
  res.json(newMod);
});

// Unit Conversions
productsRouter.get('/unit-conversions', (req, res) => {
  res.json(db.get('unit_conversions'));
});

// Get Recipe by Product ID
productsRouter.get('/recipe/:id', (req, res) => {
  const productId = req.params.id;
  const recipes = db.get('product_recipes').filter((r: any) => r.product_id === productId);
  const ingredients = db.get('ingredients');

  const enriched = recipes.map((r: any) => {
    const ing = ingredients.find((i: any) => i.id === r.ingredient_id);
    return {
      ...r,
      ingredient_name: ing ? ing.name : 'Unknown Ingredient',
      ingredient_unit: ing ? ing.base_unit : 'unit',
      cost_per_unit: ing ? ing.cost_per_unit : 0,
      quantity_required: r.quantity,
    };
  });

  res.json({ recipe: enriched });
});

// Create product with optional variants & BOM recipes
productsRouter.post('/', (req, res) => {
  const { name, code, category_id, description, image_url, base_price, is_recipe_based, has_variants, track_stock, variants, recipes } = req.body;

  const newProduct = {
    id: `prod-${crypto.randomUUID()}`,
    code: code || `PRD-${Date.now().toString().slice(-4)}`,
    name,
    category_id,
    description,
    image_url: image_url || 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=500&auto=format&fit=crop&q=60',
    base_price: Number(base_price),
    cost_price: 0,
    is_recipe_based: Boolean(is_recipe_based),
    has_variants: Boolean(has_variants),
    is_available: true,
    track_stock: track_stock !== undefined ? Boolean(track_stock) : true,
    is_deleted: false,
    created_at: new Date().toISOString(),
  };

  db.insert('products', newProduct);

  // Insert variants if provided
  if (variants && Array.isArray(variants)) {
    for (const v of variants) {
      db.insert('product_variants', {
        id: `var-${crypto.randomUUID()}`,
        product_id: newProduct.id,
        name: v.name,
        additional_price: Number(v.additional_price) || 0,
        recipe_multiplier: Number(v.recipe_multiplier) || 1.0,
        sku: v.sku || `${newProduct.code}-${v.name.slice(0, 3).toUpperCase()}`,
      });
    }
  }

  // Insert recipes if provided
  if (recipes && Array.isArray(recipes)) {
    for (const r of recipes) {
      db.insert('product_recipes', {
        id: `rec-${crypto.randomUUID()}`,
        product_id: newProduct.id,
        variant_id: r.variant_id || null,
        ingredient_id: r.ingredient_id,
        quantity: Number(r.quantity),
      });
    }
  }

  // Update calculated cost price
  newProduct.cost_price = calculateProductCostPrice(newProduct.id);
  db.update('products', (p: any) => p.id === newProduct.id, { cost_price: newProduct.cost_price });

  res.json(newProduct);
});

// Update product
productsRouter.put('/:id', (req, res) => {
  const productId = req.params.id;
  const { variants, recipes, ...productData } = req.body;

  const updated = db.update('products', (p: any) => p.id === productId, productData);
  if (!updated) return res.status(404).json({ error: 'Produk tidak ditemukan' });

  // Update variants if supplied
  if (variants && Array.isArray(variants)) {
    db.delete('product_variants', (v: any) => v.product_id === productId);
    for (const v of variants) {
      db.insert('product_variants', {
        id: v.id || `var-${crypto.randomUUID()}`,
        product_id: productId,
        name: v.name,
        additional_price: Number(v.additional_price) || 0,
        recipe_multiplier: Number(v.recipe_multiplier) || 1.0,
        sku: v.sku,
      });
    }
  }

  // Update recipes if supplied
  if (recipes && Array.isArray(recipes)) {
    db.delete('product_recipes', (r: any) => r.product_id === productId);
    for (const r of recipes) {
      db.insert('product_recipes', {
        id: r.id || `rec-${crypto.randomUUID()}`,
        product_id: productId,
        variant_id: r.variant_id || null,
        ingredient_id: r.ingredient_id,
        quantity: Number(r.quantity),
      });
    }
  }

  const newCost = calculateProductCostPrice(productId);
  db.update('products', (p: any) => p.id === productId, { cost_price: newCost });

  res.json(updated);
});

// Soft Delete product
productsRouter.delete('/:id', (req, res) => {
  const productId = req.params.id;
  const prod = db.get('products').find((p: any) => p.id === productId);
  if (!prod) return res.status(404).json({ error: 'Produk tidak ditemukan' });

  db.update('products', (p: any) => p.id === productId, { ...prod, is_deleted: true });
  res.json({ success: true, message: 'Produk berhasil dihapus' });
});
