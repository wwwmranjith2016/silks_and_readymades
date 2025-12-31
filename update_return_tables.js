#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('Manual Database Update Script for Return Tables');
console.log('==============================================');

async function updateDatabase() {
  try {
    // Try to require sql.js
    let SQL;
    try {
      const sqlJs = require('sql.js');
      SQL = await sqlJs();
    } catch (error) {
      console.error('Error loading sql.js. Make sure it\'s installed:');
      console.error('npm install sql.js');
      return;
    }

    // Database path - try common locations
    const possiblePaths = [
      path.join(process.cwd(), 'billing.db'),
      path.join(process.env.APPDATA || '', 'billing.db'),
      path.join(require('os').homedir(), 'AppData', 'Roaming', 'billing.db')
    ];

    let dbPath = null;
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        dbPath = testPath;
        break;
      }
    }

    if (!dbPath) {
      console.log('Database file not found in common locations.');
      console.log('Please provide the path to your billing.db file:');
      
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      dbPath = await new Promise((resolve) => {
        rl.question('Enter database path: ', (answer) => {
          rl.close();
          resolve(answer.trim());
        });
      });
    }

    console.log(`Using database: ${dbPath}`);

    if (!fs.existsSync(dbPath)) {
      console.error('Database file not found at:', dbPath);
      return;
    }

    // Load database
    const buffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(buffer);

    // Check if return_transactions table exists
    const result = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='return_transactions'");
    
    if (result.length > 0 && result[0].values.length > 0) {
      console.log('Return tables already exist. No updates needed.');
      db.close();
      return;
    }

    console.log('Creating return tables...');

    // SQL to create return tables
    const returnSchema = `
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

-- TRIGGER TO UPDATE STOCK ON RETURN ITEMS (Add back to stock)
CREATE TRIGGER IF NOT EXISTS update_stock_on_return_items_insert
AFTER INSERT ON return_items
BEGIN
    UPDATE products 
    SET stock_quantity = stock_quantity + NEW.quantity,
        updated_at = CURRENT_TIMESTAMP
    WHERE product_id = NEW.product_id;
    
    INSERT INTO stock_transactions (product_id, transaction_type, quantity, reference_type, reference_id)
    VALUES (NEW.product_id, 'RETURN', NEW.quantity, 'RETURN', NEW.return_id);
END;

-- TRIGGER TO UPDATE STOCK ON EXCHANGE ITEMS (Remove from stock)
CREATE TRIGGER IF NOT EXISTS update_stock_on_exchange_items_insert
AFTER INSERT ON exchange_items
BEGIN
    UPDATE products 
    SET stock_quantity = stock_quantity - NEW.quantity,
        updated_at = CURRENT_TIMESTAMP
    WHERE product_id = NEW.product_id;
    
    INSERT INTO stock_transactions (product_id, transaction_type, quantity, reference_type, reference_id)
    VALUES (NEW.product_id, 'EXCHANGE', -NEW.quantity, 'RETURN', NEW.return_id);
END;

-- INDEXES FOR RETURN TABLES
CREATE INDEX IF NOT EXISTS idx_return_transactions_date ON return_transactions(return_date);
CREATE INDEX IF NOT EXISTS idx_return_transactions_original_bill ON return_transactions(original_bill_id);
CREATE INDEX IF NOT EXISTS idx_return_items_return ON return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_exchange_items_return ON exchange_items(return_id);`;

    // Execute the SQL
    db.run(returnSchema);

    // Save updated database
    const data = db.export();
    const updatedBuffer = Buffer.from(data);
    fs.writeFileSync(dbPath, updatedBuffer);

    db.close();

    console.log('✅ Database updated successfully!');
    console.log('Return tables have been created:');
    console.log('- return_transactions');
    console.log('- return_items');
    console.log('- exchange_items');
    console.log('And related triggers and indexes.');
    
  } catch (error) {
    console.error('Error updating database:', error.message);
  }
}

// Run the update
updateDatabase();