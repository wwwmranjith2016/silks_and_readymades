-- SHOP INFO TABLE
CREATE TABLE IF NOT EXISTS shop_info (
    shop_id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_name TEXT NOT NULL DEFAULT 'My Shop',
    owner_name TEXT,
    phone TEXT,
    address TEXT,
    bill_prefix TEXT DEFAULT 'BILL',
    bill_counter INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default shop
INSERT INTO shop_info (shop_name) VALUES ('My Shop');

-- PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
    product_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_code TEXT UNIQUE,
    barcode TEXT UNIQUE,
    barcode_type TEXT DEFAULT 'CODE128',
    product_name TEXT NOT NULL,
    category TEXT DEFAULT 'GENERAL',
    sub_category TEXT,
    size TEXT,
    color TEXT,
    purchase_price REAL DEFAULT 0,
    selling_price REAL NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    min_stock_level INTEGER DEFAULT 5,
    is_active INTEGER DEFAULT 1,
    barcode_generated_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS customers (
    customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT,
    phone TEXT UNIQUE,
    address TEXT,
    total_purchases REAL DEFAULT 0,
    credit_balance REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- BILLS TABLE
CREATE TABLE IF NOT EXISTS bills (
    bill_id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_number TEXT UNIQUE NOT NULL,
    customer_id INTEGER,
    customer_name TEXT,
    customer_phone TEXT,
    subtotal REAL NOT NULL,
    discount_amount REAL DEFAULT 0,
    discount_percentage REAL DEFAULT 0,
    total_amount REAL NOT NULL,
    payment_mode TEXT DEFAULT 'CASH',
    paid_amount REAL DEFAULT 0,
    balance_amount REAL DEFAULT 0,
    bill_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    is_return INTEGER DEFAULT 0,
    original_bill_id INTEGER,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    FOREIGN KEY (original_bill_id) REFERENCES bills(bill_id)
);

-- BILL ITEMS TABLE
CREATE TABLE IF NOT EXISTS bill_items (
    item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id INTEGER NOT NULL,
    product_id INTEGER,
    product_name TEXT NOT NULL,
    product_code TEXT,
    barcode TEXT,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL,
    FOREIGN KEY (bill_id) REFERENCES bills(bill_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- STOCK TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS stock_transactions (
    transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    transaction_type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    reference_type TEXT,
    reference_id INTEGER,
    transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- BARCODE SEQUENCE TABLE
CREATE TABLE IF NOT EXISTS barcode_sequence (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prefix TEXT DEFAULT 'SB',
    current_number INTEGER DEFAULT 1000,
    last_generated DATETIME
);

-- Insert default sequence
INSERT INTO barcode_sequence (prefix, current_number) VALUES ('SB', 1000);

-- SETTINGS TABLE
CREATE TABLE IF NOT EXISTS settings (
    setting_key TEXT PRIMARY KEY,
    setting_value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_bills_date ON bills(bill_date);
CREATE INDEX IF NOT EXISTS idx_bills_customer ON bills(customer_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_bill_items_bill ON bill_items(bill_id);

-- RETURN TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS return_transactions (
    return_id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_bill_id INTEGER NOT NULL,
    customer_name TEXT,
    customer_phone TEXT,
    return_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    return_reason TEXT,
    total_return_value REAL DEFAULT 0,
    total_exchange_value REAL DEFAULT 0,
    balance_amount REAL DEFAULT 0,
    status TEXT DEFAULT 'PENDING',
    notes TEXT,
    FOREIGN KEY (original_bill_id) REFERENCES bills(bill_id)
);

-- RETURN ITEMS TABLE (Items being returned)
CREATE TABLE IF NOT EXISTS return_items (
    return_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    return_id INTEGER NOT NULL,
    product_id INTEGER,
    product_name TEXT NOT NULL,
    product_code TEXT,
    barcode TEXT,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL,
    FOREIGN KEY (return_id) REFERENCES return_transactions(return_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- EXCHANGE ITEMS TABLE (Items customer is taking in exchange)
CREATE TABLE IF NOT EXISTS exchange_items (
    exchange_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    return_id INTEGER NOT NULL,
    product_id INTEGER,
    product_name TEXT NOT NULL,
    product_code TEXT,
    barcode TEXT,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL,
    FOREIGN KEY (return_id) REFERENCES return_transactions(return_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- TRIGGERS
CREATE TRIGGER IF NOT EXISTS update_stock_on_bill_insert
AFTER INSERT ON bill_items
BEGIN
    -- Only update stock for regular sales, not return exchanges
    -- Check if this bill is NOT a return bill
    UPDATE products 
    SET stock_quantity = stock_quantity - NEW.quantity,
        updated_at = CURRENT_TIMESTAMP
    WHERE product_id = NEW.product_id
    AND NEW.bill_id NOT IN (
        SELECT bill_id FROM bills WHERE is_return = 1
    );
    
    -- Only log SALE transaction for regular sales, not returns
    INSERT INTO stock_transactions (product_id, transaction_type, quantity, reference_type, reference_id)
    SELECT NEW.product_id, 'SALE', -NEW.quantity, 'BILL', NEW.bill_id
    WHERE NEW.bill_id NOT IN (
        SELECT bill_id FROM bills WHERE is_return = 1
    );
END;

-- TRIGGER TO UPDATE STOCK ON RETURN ITEMS (Add back to stock)
-- This trigger adds stock back when items are returned
CREATE TRIGGER IF NOT EXISTS update_stock_on_return_items_insert
AFTER INSERT ON return_items
BEGIN
    -- Only update stock if this is a genuine return (not a sale)
    -- Check if this return item corresponds to a return transaction (not a sale)
    UPDATE products 
    SET stock_quantity = stock_quantity + NEW.quantity,
        updated_at = CURRENT_TIMESTAMP
    WHERE product_id = NEW.product_id;
    
    INSERT INTO stock_transactions (product_id, transaction_type, quantity, reference_type, reference_id)
    VALUES (NEW.product_id, 'RETURN', NEW.quantity, 'RETURN', NEW.return_id);
END;

-- TRIGGER TO UPDATE STOCK ON EXCHANGE ITEMS (Remove from stock)
-- This trigger removes stock when items are taken in exchange
CREATE TRIGGER IF NOT EXISTS update_stock_on_exchange_items_insert
AFTER INSERT ON exchange_items
BEGIN
    -- Only update stock if this is a genuine exchange
    UPDATE products 
    SET stock_quantity = stock_quantity - NEW.quantity,
        updated_at = CURRENT_TIMESTAMP
    WHERE product_id = NEW.product_id;
    
    INSERT INTO stock_transactions (product_id, transaction_type, quantity, reference_type, reference_id)
    VALUES (NEW.product_id, 'EXCHANGE', -NEW.quantity, 'RETURN', NEW.return_id);
END;

-- DEBUGGING TRIGGER: Log all stock changes
CREATE TRIGGER IF NOT EXISTS log_stock_changes
AFTER UPDATE OF stock_quantity ON products
BEGIN
    INSERT INTO stock_transactions (product_id, transaction_type, quantity, reference_type, reference_id, notes)
    SELECT 
        NEW.product_id,
        'STOCK_UPDATE',
        NEW.stock_quantity - OLD.stock_quantity,
        'SYSTEM',
        NULL,
        'Auto-updated stock quantity: ' || OLD.stock_quantity || ' -> ' || NEW.stock_quantity
    WHERE NEW.stock_quantity != OLD.stock_quantity;
END;

CREATE TRIGGER IF NOT EXISTS update_bill_counter
AFTER INSERT ON bills
BEGIN
    UPDATE shop_info 
    SET bill_counter = bill_counter + 1
    WHERE shop_id = 1;
END;

-- INDEXES FOR RETURN TABLES
CREATE INDEX IF NOT EXISTS idx_return_transactions_date ON return_transactions(return_date);
CREATE INDEX IF NOT EXISTS idx_return_transactions_original_bill ON return_transactions(original_bill_id);
CREATE INDEX IF NOT EXISTS idx_return_items_return ON return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_exchange_items_return ON exchange_items(return_id);