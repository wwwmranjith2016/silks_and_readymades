const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class DatabaseManager {
  constructor() {
    this.db = null;
    this.SQL = null;
  }

  async initialize() {
    try {
      // Initialize SQL.js
      this.SQL = await initSqlJs();
      
      // Database path
      const userDataPath = app.getPath('userData');
      const dbPath = path.join(userDataPath, 'billing.db');
      
      console.log('Database path:', dbPath);
      
      // Check if database file exists
      if (fs.existsSync(dbPath)) {
        // Load existing database
        const buffer = fs.readFileSync(dbPath);
        this.db = new this.SQL.Database(buffer);
        console.log('Existing database loaded');
        
        // Check if we need to run schema updates
        await this.checkAndUpdateSchema();
      } else {
        // Create new database
        this.db = new this.SQL.Database();
        this.runMigrations();
        this.saveDatabase(dbPath);
        console.log('New database created');
      }
      
      return { success: true, path: dbPath };
    } catch (error) {
      console.error('Database initialization error:', error);
      return { success: false, error: error.message };
    }
  }

  runMigrations() {
    try {
      const schemaPath = path.join(__dirname, '../../schema.sql');
      console.log('Loading schema from:', schemaPath);
      
      if (!fs.existsSync(schemaPath)) {
        throw new Error(`Schema file not found at: ${schemaPath}`);
      }
      
      const schema = fs.readFileSync(schemaPath, 'utf8');
      console.log('Schema file loaded, size:', schema.length, 'characters');
      
      // Execute schema
      this.db.run(schema);
      console.log('Database schema created successfully');
    } catch (error) {
      console.error('Error running migrations:', error);
      throw error;
    }
  }

  async checkAndUpdateSchema() {
    try {
      console.log('Checking for missing tables...');
      
      // Check if return_transactions table exists
      const returnTableExists = this.checkTableExists('return_transactions');
      
      if (!returnTableExists) {
        console.log('Return tables missing. Running schema updates...');
        
        // Extract just the return-related table definitions from schema
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
        
        // Execute the return schema
        this.db.run(returnSchema);
        console.log('Return tables created successfully');
        
        // Save the updated database
        const userDataPath = app.getPath('userData');
        const dbPath = path.join(userDataPath, 'billing.db');
        this.saveDatabase(dbPath);
        
        console.log('Database schema updated successfully');
      } else {
        console.log('All tables exist, no updates needed');
      }
    } catch (error) {
      console.error('Error updating schema:', error);
      throw error;
    }
  }

  checkTableExists(tableName) {
    try {
      const result = this.db.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`);
      return result.length > 0 && result[0].values.length > 0;
    } catch (error) {
      console.error(`Error checking if table ${tableName} exists:`, error);
      return false;
    }
  }

  saveDatabase(dbPath) {
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbPath, buffer);
    } catch (error) {
      console.error('Error saving database:', error);
    }
  }

  getDatabase() {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  // Helper method to run queries
  run(sql, params = []) {
    try {
      // Execute the query
      this.db.run(sql, params);
      
      // For INSERT operations, get the last insert ID
      if (sql.trim().toUpperCase().startsWith('INSERT')) {
        // Get the last insert ID using a separate query
        const lastIdResult = this.db.exec("SELECT last_insert_rowid() as lastID");
        if (lastIdResult.length > 0 && lastIdResult[0].values.length > 0) {
          return {
            lastID: lastIdResult[0].values[0][0],
            changes: this.db.getRowsModified()
          };
        }
      }
      
      // For other operations, return the number of changes
      return {
        changes: this.db.getRowsModified()
      };
    } catch (error) {
      console.error('Database run error:', error);
      throw error;
    }
  }

  // Helper method to get single row
  get(sql, params = []) {
    const result = this.db.exec(sql, params);
    if (result.length > 0 && result[0].values.length > 0) {
      const columns = result[0].columns;
      const values = result[0].values[0];
      const row = {};
      columns.forEach((col, index) => {
        row[col] = values[index];
      });
      return row;
    }
    return null;
  }

  // Helper method to get all rows
  all(sql, params = []) {
    const result = this.db.exec(sql, params);
    if (result.length > 0) {
      const columns = result[0].columns;
      return result[0].values.map(values => {
        const row = {};
        columns.forEach((col, index) => {
          row[col] = values[index];
        });
        return row;
      });
    }
    return [];
  }

  // Transaction support
  runTransaction(queries) {
    try {
      this.db.run('BEGIN TRANSACTION');
      const results = [];
      
      for (const query of queries) {
        const result = this.run(query.sql, query.params);
        results.push(result);
      }
      
      this.db.run('COMMIT');
      return results;
    } catch (error) {
      this.db.run('ROLLBACK');
      throw error;
    }
  }

  // Transaction control methods
  beginTransaction() {
    this.db.run('BEGIN TRANSACTION');
  }

  commitTransaction() {
    this.db.run('COMMIT');
  }

  rollbackTransaction() {
    this.db.run('ROLLBACK');
  }

  close() {
    if (this.db) {
      // Save before closing
      const userDataPath = app.getPath('userData');
      const dbPath = path.join(userDataPath, 'billing.db');
      this.saveDatabase(dbPath);
      this.db.close();
    }
  }
}

module.exports = DatabaseManager;