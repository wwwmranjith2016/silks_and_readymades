const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const DatabaseManager = require('./database/db/db.js');
const BarcodeGenerator = require('./barcode/barcode-generator');

let mainWindow;
let dbManager;
let barcodeGenerator;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Initialize database
  dbManager = new DatabaseManager();
  const dbResult = await dbManager.initialize();
  
  if (!dbResult.success) {
    console.error('Failed to initialize database:', dbResult.error);
  } else {
    console.log('Database initialized successfully');
  }

  // Initialize barcode generator
  barcodeGenerator = new BarcodeGenerator();

  // Setup IPC handlers
  setupIPCHandlers();

  // Load app
  mainWindow.loadURL('http://localhost:5173');
  mainWindow.webContents.openDevTools();
}

function setupIPCHandlers() {
  // Test handler
  ipcMain.handle('test', async () => {
    return { message: 'IPC is working!' };
  });

  // Barcode generation
  ipcMain.handle('barcode:generateUnique', async (event, category) => {
    return barcodeGenerator.generateUniqueBarcode(dbManager, category);
  });

  // ===== PRODUCT HANDLERS =====
  
  // Get all products
  ipcMain.handle('products:getAll', async () => {
    try {
      const products = dbManager.all(
        'SELECT * FROM products WHERE is_active = 1 ORDER BY product_name'
      );
      return { success: true, data: products };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get product by ID
  ipcMain.handle('products:getById', async (event, id) => {
    try {
      const product = dbManager.get(
        'SELECT * FROM products WHERE product_id = ?',
        [id]
      );
      return { success: true, data: product };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Create product
  ipcMain.handle('products:create', async (event, data) => {
    try {
      dbManager.run(
        `INSERT INTO products (
          product_code, barcode, barcode_type, product_name, category,
          sub_category, size, color, purchase_price, selling_price,
          stock_quantity, min_stock_level, barcode_generated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          data.product_code || null,
          data.barcode,
          data.barcode_type || 'CODE128',
          data.product_name,
          data.category || 'GENERAL',
          data.sub_category || null,
          data.size || null,
          data.color || null,
          data.purchase_price || 0,
          data.selling_price,
          data.stock_quantity || 0,
          data.min_stock_level || 5
        ]
      );

      // Save database
      const path = require('path');
      const dbPath = path.join(app.getPath('userData'), 'billing.db');
      dbManager.saveDatabase(dbPath);

      return { success: true, message: 'Product created successfully' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Update product
  ipcMain.handle('products:update', async (event, id, data) => {
    try {
      dbManager.run(
        `UPDATE products SET
          product_code = ?,
          barcode = ?,
          barcode_type = ?,
          product_name = ?,
          category = ?,
          sub_category = ?,
          size = ?,
          color = ?,
          purchase_price = ?,
          selling_price = ?,
          stock_quantity = ?,
          min_stock_level = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE product_id = ?`,
        [
          data.product_code || null,
          data.barcode,
          data.barcode_type || 'CODE128',
          data.product_name,
          data.category || 'GENERAL',
          data.sub_category || null,
          data.size || null,
          data.color || null,
          data.purchase_price || 0,
          data.selling_price,
          data.stock_quantity || 0,
          data.min_stock_level || 5,
          id
        ]
      );

      // Save database
      const path = require('path');
      const dbPath = path.join(app.getPath('userData'), 'billing.db');
      dbManager.saveDatabase(dbPath);

      return { success: true, message: 'Product updated successfully' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Delete product (soft delete)
  ipcMain.handle('products:delete', async (event, id) => {
    try {
      dbManager.run(
        'UPDATE products SET is_active = 0 WHERE product_id = ?',
        [id]
      );

      // Save database
      const path = require('path');
      const dbPath = path.join(app.getPath('userData'), 'billing.db');
      dbManager.saveDatabase(dbPath);

      return { success: true, message: 'Product deleted successfully' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Search products
  ipcMain.handle('products:search', async (event, query) => {
    try {
      const products = dbManager.all(
        `SELECT * FROM products 
         WHERE is_active = 1 
         AND (product_name LIKE ? OR barcode LIKE ? OR product_code LIKE ?)
         ORDER BY product_name
         LIMIT 50`,
        [`%${query}%`, `%${query}%`, `%${query}%`]
      );
      return { success: true, data: products };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Find product by barcode
  ipcMain.handle('products:findByBarcode', async (event, barcode) => {
    try {
      const product = dbManager.get(
        'SELECT * FROM products WHERE barcode = ? AND is_active = 1',
        [barcode]
      );
      return { success: true, data: product };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
// ===== BILLS HANDLERS =====
  
  // Create bill
  ipcMain.handle('bills:create', async (event, billData) => {
    try {
      // Get shop info for bill number
      const shopInfo = dbManager.get('SELECT * FROM shop_info WHERE shop_id = 1');
      const billNumber = `${shopInfo.bill_prefix}-${shopInfo.bill_counter.toString().padStart(4, '0')}`;
      
      // Insert bill
      dbManager.run(
        `INSERT INTO bills (
          bill_number, customer_id, customer_name, customer_phone,
          subtotal, discount_amount, discount_percentage, total_amount,
          payment_mode, paid_amount, balance_amount, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          billNumber,
          billData.customer_id || null,
          billData.customer_name || null,
          billData.customer_phone || null,
          billData.subtotal,
          billData.discount_amount || 0,
          billData.discount_percentage || 0,
          billData.total_amount,
          billData.payment_mode || 'CASH',
          billData.paid_amount || billData.total_amount,
          billData.balance_amount || 0,
          billData.notes || null
        ]
      );

      // Get the inserted bill ID
      const bill = dbManager.get('SELECT * FROM bills WHERE bill_number = ?', [billNumber]);

      // Insert bill items
      for (const item of billData.items) {
        dbManager.run(
          `INSERT INTO bill_items (
            bill_id, product_id, product_name, product_code, barcode,
            quantity, unit_price, total_price
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            bill.bill_id,
            item.product_id,
            item.product_name,
            item.product_code || null,
            item.barcode || null,
            item.quantity,
            item.unit_price,
            item.total_price
          ]
        );
      }

      // Save database
      const path = require('path');
      const dbPath = path.join(app.getPath('userData'), 'billing.db');
      dbManager.saveDatabase(dbPath);

      return { 
        success: true, 
        message: 'Bill created successfully',
        billNumber: billNumber,
        billId: bill.bill_id
      };
    } catch (error) {
      console.error('Bill creation error:', error);
      return { success: false, error: error.message };
    }
  });

  // Get bill by ID with items
  ipcMain.handle('bills:getById', async (event, id) => {
    try {
      const bill = dbManager.get('SELECT * FROM bills WHERE bill_id = ?', [id]);
      if (bill) {
        const items = dbManager.all('SELECT * FROM bill_items WHERE bill_id = ?', [id]);
        bill.items = items;
      }
      return { success: true, data: bill };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get today's bills
  ipcMain.handle('bills:getToday', async () => {
    try {
      const bills = dbManager.all(
        `SELECT * FROM bills 
         WHERE DATE(bill_date) = DATE('now')
         ORDER BY bill_date DESC`
      );
      return { success: true, data: bills };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get all bills with filters
  ipcMain.handle('bills:getAll', async (event, filters = {}) => {
    try {
      let sql = 'SELECT * FROM bills WHERE 1=1';
      const params = [];

      if (filters.startDate) {
        sql += ' AND DATE(bill_date) >= DATE(?)';
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        sql += ' AND DATE(bill_date) <= DATE(?)';
        params.push(filters.endDate);
      }

      sql += ' ORDER BY bill_date DESC LIMIT 100';

      const bills = dbManager.all(sql, params);
      return { success: true, data: bills };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get daily sales summary
  ipcMain.handle('reports:dailySales', async (event, date) => {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      // Total sales
      const summary = dbManager.get(
        `SELECT 
          COUNT(*) as total_bills,
          SUM(total_amount) as total_sales,
          SUM(CASE WHEN payment_mode = 'CASH' THEN total_amount ELSE 0 END) as cash_sales,
          SUM(CASE WHEN payment_mode = 'UPI' THEN total_amount ELSE 0 END) as upi_sales,
          SUM(CASE WHEN payment_mode = 'CARD' THEN total_amount ELSE 0 END) as card_sales,
          SUM(CASE WHEN payment_mode = 'CREDIT' THEN total_amount ELSE 0 END) as credit_sales
         FROM bills 
         WHERE DATE(bill_date) = DATE(?)`,
        [targetDate]
      );

      // Top selling items
      const topItems = dbManager.all(
        `SELECT 
          bi.product_name,
          SUM(bi.quantity) as total_quantity,
          SUM(bi.total_price) as total_amount
         FROM bill_items bi
         JOIN bills b ON bi.bill_id = b.bill_id
         WHERE DATE(b.bill_date) = DATE(?)
         GROUP BY bi.product_name
         ORDER BY total_quantity DESC
         LIMIT 10`,
        [targetDate]
      );

      return { 
        success: true, 
        data: {
          summary: summary || {
            total_bills: 0,
            total_sales: 0,
            cash_sales: 0,
            upi_sales: 0,
            card_sales: 0,
            credit_sales: 0
          },
          topItems: topItems || []
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (dbManager) {
      dbManager.close();
    }
    app.quit();
  }
});