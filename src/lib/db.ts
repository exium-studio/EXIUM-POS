import Dexie, { Table } from 'dexie';
import { Product, ProductCategory, Ingredient, DiningTable, Shift, OfflineSyncQueueItem } from '../types';

export class POSIndexedDB extends Dexie {
  products!: Table<Product, string>;
  categories!: Table<ProductCategory, string>;
  ingredients!: Table<Ingredient, string>;
  dining_tables!: Table<DiningTable, string>;
  shifts!: Table<Shift, string>;
  sync_queue!: Table<OfflineSyncQueueItem, string>;

  constructor() {
    super('NusantaraPOS_OfflineDB');
    this.version(1).stores({
      products: 'id, category_id, code, is_recipe_based',
      categories: 'id, slug, kitchen_station',
      ingredients: 'id, code, category',
      dining_tables: 'id, branch_id, table_number, qr_token',
      shifts: 'id, branch_id, status',
      sync_queue: 'id, action, client_uuid, status, timestamp',
    });
  }
}

export const localDB = new POSIndexedDB();
