// TypeScript Domain Models for Nusantara POS Enterprise

export type RoleType = 'superadmin' | 'owner' | 'manager' | 'cashier' | 'kitchen_food' | 'kitchen_beverage';

export interface Branch {
  id: string;
  code: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  operating_hours: string;
  tax_percentage: number;
  service_charge_percentage: number;
  is_tax_inclusive: boolean;
  auto_print_kitchen: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  receipt_header_name?: string;
  receipt_header_tagline?: string;
  receipt_footer_text?: string;
  receipt_show_social?: boolean;
  receipt_social_handle?: string;
  receipt_tax_label?: string;
  receipt_service_label?: string;
  receipt_logo_url?: string;
  receipt_paper_width?: '58mm' | '80mm';
}

export interface User {
  id: string;
  username: string;
  full_name: string;
  email: string;
  phone?: string;
  role_id: RoleType;
  role_name?: string;
  is_active: boolean;
  branch_ids: string[]; // Assigned branches
  password?: string;
  permissions?: string[];
  active_branch_id?: string;
}

export interface Permission {
  id: string;
  module: string;
  action: string;
  description: string;
}

export interface Ingredient {
  id: string;
  code: string;
  name: string;
  category: string;
  base_unit: string; // gram, ml, pcs, lembar
  cost_per_unit: number;
  min_stock_alert: number;
  current_stock?: number; // helper for active branch
}

export interface UnitConversion {
  id: string;
  from_unit: string;
  to_unit: string;
  multiplier: number;
  description?: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  kitchen_station: 'food' | 'beverage' | 'dessert' | 'other';
  icon?: string;
  sort_order: number;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string; // e.g. Reguler, Large, Hot, Iced
  additional_price: number;
  recipe_multiplier: number;
  sku?: string;
}

export interface ProductModifier {
  id: string;
  name: string;
  category: string;
  price: number;
  ingredient_id?: string;
  ingredient_qty?: number;
}

export interface ProductRecipe {
  id: string;
  product_id: string;
  variant_id?: string | null;
  ingredient_id: string;
  ingredient_name?: string;
  ingredient_unit?: string;
  quantity: number; // in base_unit
  cost_share?: number;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  category_id: string;
  category_name?: string;
  kitchen_station?: 'food' | 'beverage' | 'dessert' | 'other';
  description?: string;
  image_url?: string;
  base_price: number;
  cost_price: number; // Calculated HPP
  is_recipe_based: boolean;
  has_variants: boolean;
  is_available: boolean;
  track_stock: boolean;
  variants?: ProductVariant[];
  recipes?: ProductRecipe[];
  stock_in_branch?: number;
}

export interface StockBranch {
  id: string;
  branch_id: string;
  item_type: 'ingredient' | 'product';
  item_id: string;
  current_stock: number;
  min_stock_alert: number;
  last_updated?: string;
}

export interface StockMovement {
  id: string;
  branch_id: string;
  branch_name?: string;
  item_type: 'ingredient' | 'product';
  item_id: string;
  item_name?: string;
  movement_type: 'purchase' | 'sales_cogs' | 'opname_adjustment' | 'transfer_out' | 'transfer_in' | 'waste' | 'supplier_return';
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
  reference_id?: string;
  notes?: string;
  created_by?: string;
  created_by_name?: string;
  created_at: string;
}

export interface StockOpnameItem {
  id: string;
  opname_id: string;
  item_type: 'ingredient' | 'product';
  item_id: string;
  item_name: string;
  system_stock: number;
  physical_stock: number;
  difference: number;
  unit: string;
  unit_cost: number;
  notes?: string;
}

export interface StockOpname {
  id: string;
  branch_id: string;
  branch_name?: string;
  opname_number: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  notes?: string;
  counted_by: string;
  counted_by_name?: string;
  approved_by?: string;
  approved_by_name?: string;
  approved_at?: string;
  created_at: string;
  items: StockOpnameItem[];
}

export interface StockTransferItem {
  id: string;
  transfer_id: string;
  item_type: 'ingredient' | 'product';
  item_id: string;
  item_name: string;
  quantity: number;
  unit: string;
}

export interface StockTransfer {
  id: string;
  transfer_number: string;
  from_branch_id: string;
  from_branch_name?: string;
  to_branch_id: string;
  to_branch_name?: string;
  status: 'pending' | 'approved' | 'in_transit' | 'received' | 'rejected';
  notes?: string;
  created_by: string;
  created_by_name?: string;
  approved_by?: string;
  received_by?: string;
  created_at: string;
  received_at?: string;
  items: StockTransferItem[];
}

export interface Supplier {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  payment_terms_days: number;
  created_at?: string;
}

export interface PurchaseOrderItem {
  id: string;
  po_id: string;
  item_type: 'ingredient' | 'product';
  item_id: string;
  item_name: string;
  quantity_ordered: number;
  quantity_received: number;
  unit: string;
  unit_price: number;
  total_price: number;
}

export interface PurchaseOrder {
  id: string;
  branch_id: string;
  branch_name?: string;
  supplier_id: string;
  supplier_name?: string;
  po_number: string;
  status: 'draft' | 'submitted' | 'approved' | 'ordered' | 'received_partial' | 'received_full' | 'cancelled';
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  payment_status: 'unpaid' | 'partial' | 'paid';
  notes?: string;
  created_by: string;
  created_by_name?: string;
  approved_by?: string;
  approved_by_name?: string;
  approved_at?: string;
  due_date?: string;
  created_at: string;
  items: PurchaseOrderItem[];
}

export interface GoodsReceipt {
  id: string;
  receipt_number: string;
  po_id: string;
  branch_id: string;
  supplier_invoice_number?: string;
  received_date: string;
  received_by: string;
  notes?: string;
}

export interface DiningTable {
  id: string;
  branch_id: string;
  table_number: string;
  zone: string;
  capacity: number;
  qr_token: string;
  order_mode: 'menu_only' | 'can_order';
  payment_flow: 'pay_at_cashier' | 'pay_online_qris';
  is_active: boolean;
  current_order_id?: string;
  occupied?: boolean;
}

export interface Shift {
  id: string;
  branch_id: string;
  branch_name?: string;
  user_id: string;
  user_name?: string;
  pos_terminal_name: string;
  start_time: string;
  end_time?: string;
  opening_cash: number;
  expected_cash: number;
  actual_cash?: number;
  cash_difference?: number;
  total_cash_sales: number;
  total_non_cash_sales: number;
  total_petty_cash_out: number;
  status: 'open' | 'closed';
  closing_notes?: string;
  approved_by?: string;
}

export interface ShiftCashRecord {
  id: string;
  shift_id: string;
  type: 'petty_cash_in' | 'petty_cash_out' | 'cash_drop';
  amount: number;
  reason: string;
  recorded_by: string;
  created_at: string;
}

export interface Attendance {
  id: string;
  user_id: string;
  user_name?: string;
  branch_id: string;
  branch_name?: string;
  date: string;
  clock_in?: string;
  clock_out?: string;
  shift_schedule: string;
  is_late: boolean;
  late_minutes: number;
  photo_url?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface Member {
  id: string;
  phone: string;
  name: string;
  email?: string;
  points: number;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  total_spent: number;
  total_visits: number;
  created_at: string;
}

export interface Promotion {
  id: string;
  code?: string;
  name: string;
  promo_type: 'percentage_discount' | 'fixed_amount' | 'bogo' | 'happy_hour';
  discount_value: number;
  min_order_amount: number;
  applicable_category_id?: string;
  start_hour?: string;
  end_hour?: string;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
}

export interface CartItemModifier {
  id: string;
  name: string;
  price: number;
  ingredient_id?: string;
  ingredient_qty?: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id?: string | null;
  product_name: string;
  variant_name?: string | null;
  quantity: number;
  unit_price: number;
  unit_cogs: number;
  subtotal: number;
  notes?: string;
  modifiers?: CartItemModifier[];
  kitchen_station: 'food' | 'beverage' | 'dessert' | 'other';
  kitchen_status: 'received' | 'in_prep' | 'ready' | 'served';
  kitchen_updated_at?: string;
}

export interface Order {
  id: string;
  client_uuid?: string;
  order_number: string;
  branch_id: string;
  branch_name?: string;
  shift_id?: string;
  table_id?: string;
  table_number?: string;
  customer_name: string;
  order_source: 'pos_cashier' | 'qr_customer';
  order_type: 'dine_in' | 'take_away' | 'delivery';
  status: 'pending_payment' | 'received' | 'preparing' | 'ready' | 'completed' | 'void';
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  service_charge_amount: number;
  total_amount: number;
  cogs_total: number;
  notes?: string;
  created_by?: string;
  created_by_name?: string;
  created_at: string;
  completed_at?: string;
  items: OrderItem[];
  payment_method?: 'cash' | 'qris' | 'debit_card' | 'credit_card' | 'bank_transfer';
  payment_status?: 'pending' | 'paid' | 'void' | 'refunded';
  member_id?: string;
  member_name?: string;
  points_earned?: number;
  points_used?: number;
}

export interface Transaction {
  id: string;
  client_uuid?: string;
  transaction_number: string;
  order_id: string;
  branch_id: string;
  shift_id?: string;
  member_id?: string;
  total_amount: number;
  paid_amount: number;
  change_amount: number;
  payment_method: 'cash' | 'qris' | 'debit_card' | 'credit_card' | 'bank_transfer';
  payment_status: 'paid' | 'void' | 'refunded';
  payment_gateway_ref?: string;
  is_offline_sync?: boolean;
  void_reason?: string;
  void_by?: string;
  created_by: string;
  created_at: string;
}

export interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  normal_balance: 'debit' | 'credit';
  category: string;
  balance?: number;
  is_active: boolean;
}

export interface JournalEntryLine {
  id: string;
  journal_id: string;
  account_id: string;
  account_code?: string;
  account_name?: string;
  debit: number;
  credit: number;
  notes?: string;
}

export interface JournalEntry {
  id: string;
  branch_id: string;
  branch_name?: string;
  entry_number: string;
  date: string;
  reference_type: 'sales' | 'cogs' | 'purchase_receipt' | 'shift_cash' | 'expense_manual' | 'void_reversal';
  reference_id?: string;
  description: string;
  created_by?: string;
  created_at: string;
  lines: JournalEntryLine[];
}

export interface IncomeStatement {
  period_start: string;
  period_end: string;
  branch_id: string;
  revenues: { code: string; name: string; amount: number }[];
  total_revenue: number;
  cogs: { code: string; name: string; amount: number }[];
  total_cogs: number;
  gross_profit: number;
  expenses: { code: string; name: string; amount: number }[];
  total_expenses: number;
  net_profit: number;
}

export interface BalanceSheet {
  as_of_date: string;
  branch_id: string;
  current_assets: { code: string; name: string; amount: number }[];
  total_current_assets: number;
  fixed_assets: { code: string; name: string; amount: number }[];
  total_fixed_assets: number;
  total_assets: number;
  liabilities: { code: string; name: string; amount: number }[];
  total_liabilities: number;
  equity: { code: string; name: string; amount: number }[];
  total_equity: number;
  total_liabilities_and_equity: number;
}

export interface CashFlowStatement {
  period_start: string;
  period_end: string;
  branch_id: string;
  operating_cash_in: number;
  operating_cash_out: number;
  net_operating_cash: number;
  investing_cash: number;
  financing_cash: number;
  net_cash_flow: number;
  opening_cash: number;
  closing_cash: number;
}

export interface TaxReport {
  period: string;
  branch_id: string;
  taxable_sales: number;
  vat_collected: number; // PPN 11% Keluaran
  service_charge_collected: number;
  transaction_count: number;
}

export interface AuditLog {
  id: string;
  branch_id?: string;
  user_id?: string;
  user_name?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  created_at: string;
}

export interface OfflineSyncQueueItem {
  id: string;
  action: 'create_order' | 'create_transaction' | 'close_shift';
  client_uuid: string;
  payload: any;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  error_message?: string;
  timestamp: string;
}
