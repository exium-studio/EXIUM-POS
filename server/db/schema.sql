-- ==============================================================================
-- NUSANTARA POS ENTERPRISE - POSTGRESQL DATABASE SCHEMA
-- Multi-Cabang, Manajemen Stok Resep (BOM), Akuntansi, KDS, Shift, QR Order
-- ==============================================================================

-- 1. CABANG & KONFIGURASI
CREATE TABLE IF NOT EXISTS branches (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(30),
    email VARCHAR(100),
    operating_hours VARCHAR(100) DEFAULT '08:00 - 22:00',
    tax_percentage NUMERIC(5,2) DEFAULT 11.00, -- PPN 11%
    service_charge_percentage NUMERIC(5,2) DEFAULT 0.00,
    is_tax_inclusive BOOLEAN DEFAULT false,
    auto_print_kitchen BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. ROLE, PERMISSION & USER
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
    id VARCHAR(100) PRIMARY KEY,
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id VARCHAR(50) REFERENCES roles(id) ON DELETE CASCADE,
    permission_id VARCHAR(100) REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE,
    phone VARCHAR(30),
    role_id VARCHAR(50) REFERENCES roles(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_branches (
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    branch_id VARCHAR(50) REFERENCES branches(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, branch_id)
);

-- 3. BAHAN BAKU, SATUAN & KONVERSI
CREATE TABLE IF NOT EXISTS ingredients (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL, -- Kopi, Susu, Sirup, Makanan, Kemasan, dll
    base_unit VARCHAR(20) NOT NULL, -- gram, ml, pcs, lembar
    cost_per_unit NUMERIC(15,2) DEFAULT 0.00,
    min_stock_alert NUMERIC(10,2) DEFAULT 100.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS unit_conversions (
    id VARCHAR(50) PRIMARY KEY,
    from_unit VARCHAR(20) NOT NULL,
    to_unit VARCHAR(20) NOT NULL,
    multiplier NUMERIC(12,4) NOT NULL, -- e.g. 1 kg = 1000 gram -> multiplier 1000
    description TEXT
);

-- 4. KATEGORI & PRODUK
CREATE TABLE IF NOT EXISTS product_categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    kitchen_station VARCHAR(50) NOT NULL DEFAULT 'food', -- 'food', 'beverage', 'dessert', 'other'
    icon VARCHAR(50),
    sort_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    category_id VARCHAR(50) REFERENCES product_categories(id),
    description TEXT,
    image_url TEXT,
    base_price NUMERIC(15,2) NOT NULL,
    cost_price NUMERIC(15,2) DEFAULT 0.00, -- HPP kalkulasi dari resep
    is_recipe_based BOOLEAN DEFAULT true,
    has_variants BOOLEAN DEFAULT false,
    is_available BOOLEAN DEFAULT true,
    track_stock BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_variants (
    id VARCHAR(50) PRIMARY KEY,
    product_id VARCHAR(50) REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- Reguler, Large, Hot, Iced
    additional_price NUMERIC(15,2) DEFAULT 0.00,
    recipe_multiplier NUMERIC(5,2) DEFAULT 1.00,
    sku VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS product_modifiers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL, -- Extra Espresso Shot, Less Sugar, Oat Milk
    category VARCHAR(50), -- Topping, Level Gula, Susu Alternatif
    price NUMERIC(15,2) DEFAULT 0.00,
    ingredient_id VARCHAR(50) REFERENCES ingredients(id) ON DELETE SET NULL,
    ingredient_qty NUMERIC(10,2) DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS product_recipes (
    id VARCHAR(50) PRIMARY KEY,
    product_id VARCHAR(50) REFERENCES products(id) ON DELETE CASCADE,
    variant_id VARCHAR(50) REFERENCES product_variants(id) ON DELETE SET NULL,
    ingredient_id VARCHAR(50) REFERENCES ingredients(id) ON DELETE CASCADE,
    quantity NUMERIC(10,3) NOT NULL, -- dalam base_unit ingredient
    cost_share NUMERIC(15,2) DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS branch_product_prices (
    branch_id VARCHAR(50) REFERENCES branches(id) ON DELETE CASCADE,
    product_id VARCHAR(50) REFERENCES products(id) ON DELETE CASCADE,
    price_override NUMERIC(15,2) NOT NULL,
    is_available BOOLEAN DEFAULT true,
    PRIMARY KEY (branch_id, product_id)
);

-- 5. MANAJEMEN STOK & MUTASI
CREATE TABLE IF NOT EXISTS stock_branch (
    id VARCHAR(50) PRIMARY KEY,
    branch_id VARCHAR(50) REFERENCES branches(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL, -- 'ingredient' atau 'product'
    item_id VARCHAR(50) NOT NULL,
    current_stock NUMERIC(12,2) DEFAULT 0.00,
    min_stock_alert NUMERIC(12,2) DEFAULT 50.00,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (branch_id, item_type, item_id)
);

CREATE TABLE IF NOT EXISTS stock_movements (
    id VARCHAR(50) PRIMARY KEY,
    branch_id VARCHAR(50) REFERENCES branches(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL, -- 'ingredient' | 'product'
    item_id VARCHAR(50) NOT NULL,
    movement_type VARCHAR(30) NOT NULL, -- 'purchase', 'sales_cogs', 'opname_adjustment', 'transfer_out', 'transfer_in', 'waste', 'supplier_return'
    quantity NUMERIC(12,2) NOT NULL, -- Positif untuk masuk, Negatif untuk keluar
    unit VARCHAR(20) NOT NULL,
    unit_cost NUMERIC(15,2) DEFAULT 0.00,
    total_cost NUMERIC(15,2) DEFAULT 0.00,
    reference_id VARCHAR(100), -- order_id, po_id, opname_id, transfer_id
    notes TEXT,
    created_by VARCHAR(50) REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_opnames (
    id VARCHAR(50) PRIMARY KEY,
    branch_id VARCHAR(50) REFERENCES branches(id),
    opname_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(30) DEFAULT 'draft', -- 'draft', 'pending_approval', 'approved', 'rejected'
    notes TEXT,
    counted_by VARCHAR(50) REFERENCES users(id),
    approved_by VARCHAR(50) REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_opname_items (
    id VARCHAR(50) PRIMARY KEY,
    opname_id VARCHAR(50) REFERENCES stock_opnames(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL,
    item_id VARCHAR(50) NOT NULL,
    system_stock NUMERIC(12,2) NOT NULL,
    physical_stock NUMERIC(12,2) NOT NULL,
    difference NUMERIC(12,2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    unit_cost NUMERIC(15,2) DEFAULT 0.00,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS stock_transfers (
    id VARCHAR(50) PRIMARY KEY,
    transfer_number VARCHAR(50) UNIQUE NOT NULL,
    from_branch_id VARCHAR(50) REFERENCES branches(id),
    to_branch_id VARCHAR(50) REFERENCES branches(id),
    status VARCHAR(30) DEFAULT 'pending', -- 'pending', 'approved', 'in_transit', 'received', 'rejected'
    notes TEXT,
    created_by VARCHAR(50) REFERENCES users(id),
    approved_by VARCHAR(50) REFERENCES users(id),
    received_by VARCHAR(50) REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    received_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS stock_transfer_items (
    id VARCHAR(50) PRIMARY KEY,
    transfer_id VARCHAR(50) REFERENCES stock_transfers(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL,
    item_id VARCHAR(50) NOT NULL,
    quantity NUMERIC(12,2) NOT NULL,
    unit VARCHAR(20) NOT NULL
);

-- 6. SUPPLIER & PEMBELIAN (PURCHASE ORDER)
CREATE TABLE IF NOT EXISTS suppliers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(30),
    email VARCHAR(100),
    address TEXT,
    payment_terms_days INT DEFAULT 30, -- Hutang jatuh tempo dalam X hari
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_orders (
    id VARCHAR(50) PRIMARY KEY,
    branch_id VARCHAR(50) REFERENCES branches(id),
    supplier_id VARCHAR(50) REFERENCES suppliers(id),
    po_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(30) DEFAULT 'draft', -- 'draft', 'submitted', 'approved', 'ordered', 'received_partial', 'received_full', 'cancelled'
    subtotal NUMERIC(15,2) DEFAULT 0.00,
    tax_amount NUMERIC(15,2) DEFAULT 0.00,
    total_amount NUMERIC(15,2) DEFAULT 0.00,
    payment_status VARCHAR(30) DEFAULT 'unpaid', -- 'unpaid', 'partial', 'paid'
    notes TEXT,
    created_by VARCHAR(50) REFERENCES users(id),
    approved_by VARCHAR(50) REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id VARCHAR(50) PRIMARY KEY,
    po_id VARCHAR(50) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL,
    item_id VARCHAR(50) NOT NULL,
    quantity_ordered NUMERIC(12,2) NOT NULL,
    quantity_received NUMERIC(12,2) DEFAULT 0.00,
    unit VARCHAR(20) NOT NULL,
    unit_price NUMERIC(15,2) NOT NULL,
    total_price NUMERIC(15,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS goods_receipts (
    id VARCHAR(50) PRIMARY KEY,
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    po_id VARCHAR(50) REFERENCES purchase_orders(id),
    branch_id VARCHAR(50) REFERENCES branches(id),
    supplier_invoice_number VARCHAR(100),
    received_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    received_by VARCHAR(50) REFERENCES users(id),
    notes TEXT
);

-- 7. MEJA & QR CODE SELF-ORDER
CREATE TABLE IF NOT EXISTS dining_tables (
    id VARCHAR(50) PRIMARY KEY,
    branch_id VARCHAR(50) REFERENCES branches(id) ON DELETE CASCADE,
    table_number VARCHAR(20) NOT NULL,
    zone VARCHAR(50) DEFAULT 'Indoor', -- Indoor, Outdoor, Lantai 2, VIP
    capacity INT DEFAULT 4,
    qr_token VARCHAR(100) UNIQUE NOT NULL,
    order_mode VARCHAR(30) DEFAULT 'can_order', -- 'menu_only', 'can_order'
    payment_flow VARCHAR(30) DEFAULT 'pay_at_cashier', -- 'pay_at_cashier', 'pay_online_qris'
    is_active BOOLEAN DEFAULT true,
    UNIQUE (branch_id, table_number)
);

-- 8. SHIFT & KAS LACI KASIR
CREATE TABLE IF NOT EXISTS shifts (
    id VARCHAR(50) PRIMARY KEY,
    branch_id VARCHAR(50) REFERENCES branches(id),
    user_id VARCHAR(50) REFERENCES users(id),
    pos_terminal_name VARCHAR(50) DEFAULT 'Kasir Utama',
    start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP WITH TIME ZONE,
    opening_cash NUMERIC(15,2) NOT NULL,
    expected_cash NUMERIC(15,2) DEFAULT 0.00,
    actual_cash NUMERIC(15,2),
    cash_difference NUMERIC(15,2),
    total_cash_sales NUMERIC(15,2) DEFAULT 0.00,
    total_non_cash_sales NUMERIC(15,2) DEFAULT 0.00,
    total_petty_cash_out NUMERIC(15,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'open', -- 'open', 'closed'
    closing_notes TEXT,
    approved_by VARCHAR(50) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS shift_cash_records (
    id VARCHAR(50) PRIMARY KEY,
    shift_id VARCHAR(50) REFERENCES shifts(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL, -- 'petty_cash_in', 'petty_cash_out', 'cash_drop'
    amount NUMERIC(15,2) NOT NULL,
    reason TEXT NOT NULL,
    recorded_by VARCHAR(50) REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. ABSENSI KARYAWAN
CREATE TABLE IF NOT EXISTS attendances (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id),
    branch_id VARCHAR(50) REFERENCES branches(id),
    date DATE NOT NULL,
    clock_in TIMESTAMP WITH TIME ZONE,
    clock_out TIMESTAMP WITH TIME ZONE,
    shift_schedule VARCHAR(50) DEFAULT 'Pagi (08:00 - 16:00)',
    is_late BOOLEAN DEFAULT false,
    late_minutes INT DEFAULT 0,
    photo_url TEXT,
    latitude NUMERIC(10,6),
    longitude NUMERIC(10,6),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. MEMBER & LOYALTI & PROMOSI
CREATE TABLE IF NOT EXISTS members (
    id VARCHAR(50) PRIMARY KEY,
    phone VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150),
    points INT DEFAULT 0,
    tier VARCHAR(30) DEFAULT 'Bronze', -- Bronze, Silver, Gold, Platinum
    total_spent NUMERIC(15,2) DEFAULT 0.00,
    total_visits INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS member_point_logs (
    id VARCHAR(50) PRIMARY KEY,
    member_id VARCHAR(50) REFERENCES members(id) ON DELETE CASCADE,
    transaction_id VARCHAR(50),
    points_change INT NOT NULL, -- + earned, - redeemed
    action VARCHAR(50) NOT NULL, -- 'earned_from_purchase', 'redeemed_discount'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS promotions (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(50) UNIQUE,
    name VARCHAR(150) NOT NULL,
    promo_type VARCHAR(30) NOT NULL, -- 'percentage_discount', 'fixed_amount', 'bogo', 'happy_hour'
    discount_value NUMERIC(10,2) NOT NULL,
    min_order_amount NUMERIC(15,2) DEFAULT 0.00,
    applicable_category_id VARCHAR(50),
    start_hour VARCHAR(10), -- '14:00'
    end_hour VARCHAR(10),   -- '17:00'
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true
);

-- 11. TRANSAKSI PENJUALAN & ORDER (KDS & POS)
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(50) PRIMARY KEY,
    client_uuid VARCHAR(100) UNIQUE, -- Idempotency & offline sync
    order_number VARCHAR(50) UNIQUE NOT NULL,
    branch_id VARCHAR(50) REFERENCES branches(id),
    shift_id VARCHAR(50) REFERENCES shifts(id),
    table_id VARCHAR(50) REFERENCES dining_tables(id),
    customer_name VARCHAR(100) DEFAULT 'Guest',
    order_source VARCHAR(30) DEFAULT 'pos_cashier', -- 'pos_cashier', 'qr_customer'
    order_type VARCHAR(30) DEFAULT 'dine_in', -- 'dine_in', 'take_away', 'delivery'
    status VARCHAR(30) DEFAULT 'pending', -- 'pending_payment', 'received', 'preparing', 'ready', 'completed', 'void'
    subtotal NUMERIC(15,2) NOT NULL,
    discount_amount NUMERIC(15,2) DEFAULT 0.00,
    tax_amount NUMERIC(15,2) DEFAULT 0.00,
    service_charge_amount NUMERIC(15,2) DEFAULT 0.00,
    total_amount NUMERIC(15,2) NOT NULL,
    cogs_total NUMERIC(15,2) DEFAULT 0.00, -- Total HPP pesanan
    notes TEXT,
    created_by VARCHAR(50) REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS order_items (
    id VARCHAR(50) PRIMARY KEY,
    order_id VARCHAR(50) REFERENCES orders(id) ON DELETE CASCADE,
    product_id VARCHAR(50) REFERENCES products(id),
    variant_id VARCHAR(50) REFERENCES product_variants(id),
    product_name VARCHAR(150) NOT NULL,
    variant_name VARCHAR(100),
    quantity INT NOT NULL,
    unit_price NUMERIC(15,2) NOT NULL,
    unit_cogs NUMERIC(15,2) DEFAULT 0.00,
    subtotal NUMERIC(15,2) NOT NULL,
    notes TEXT,
    modifiers_json JSONB,
    kitchen_station VARCHAR(50) DEFAULT 'food', -- 'food', 'beverage'
    kitchen_status VARCHAR(30) DEFAULT 'received', -- 'received', 'in_prep', 'ready', 'served'
    kitchen_updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(50) PRIMARY KEY,
    client_uuid VARCHAR(100) UNIQUE,
    transaction_number VARCHAR(50) UNIQUE NOT NULL,
    order_id VARCHAR(50) REFERENCES orders(id),
    branch_id VARCHAR(50) REFERENCES branches(id),
    shift_id VARCHAR(50) REFERENCES shifts(id),
    member_id VARCHAR(50) REFERENCES members(id),
    total_amount NUMERIC(15,2) NOT NULL,
    paid_amount NUMERIC(15,2) NOT NULL,
    change_amount NUMERIC(15,2) DEFAULT 0.00,
    payment_method VARCHAR(30) NOT NULL, -- 'cash', 'qris', 'debit_card', 'credit_card', 'bank_transfer'
    payment_status VARCHAR(30) DEFAULT 'paid', -- 'pending', 'paid', 'void', 'refunded'
    payment_gateway_ref VARCHAR(100),
    is_offline_sync BOOLEAN DEFAULT false,
    void_reason TEXT,
    void_by VARCHAR(50) REFERENCES users(id),
    created_by VARCHAR(50) REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. AKUNTANSI DOUBLE-ENTRY & COA (CHART OF ACCOUNTS)
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    account_type VARCHAR(30) NOT NULL, -- 'asset', 'liability', 'equity', 'revenue', 'expense'
    normal_balance VARCHAR(10) NOT NULL, -- 'debit' or 'credit'
    category VARCHAR(50) NOT NULL, -- Kas & Bank, Piutang, Persediaan, Hutang Lancar, Pendapatan F&B, HPP, Beban Operasional
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS journal_entries (
    id VARCHAR(50) PRIMARY KEY,
    branch_id VARCHAR(50) REFERENCES branches(id),
    entry_number VARCHAR(50) UNIQUE NOT NULL,
    date DATE NOT NULL,
    reference_type VARCHAR(50) NOT NULL, -- 'sales', 'cogs', 'purchase_receipt', 'shift_cash', 'expense_manual', 'void_reversal'
    reference_id VARCHAR(100),
    description TEXT NOT NULL,
    created_by VARCHAR(50) REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS journal_entry_lines (
    id VARCHAR(50) PRIMARY KEY,
    journal_id VARCHAR(50) REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id VARCHAR(50) REFERENCES chart_of_accounts(id),
    debit NUMERIC(15,2) DEFAULT 0.00,
    credit NUMERIC(15,2) DEFAULT 0.00,
    notes TEXT
);

-- 13. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    branch_id VARCHAR(50),
    user_id VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100),
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
