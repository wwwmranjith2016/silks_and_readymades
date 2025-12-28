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