const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const DatabaseManager = require('./database/db/db.js');
const BarcodeGenerator = require('./barcode/barcode-generator');
const ThermalPrinter = require('./thermal-printer/thermal-printer');
const StandardPrinter = require('./standard-printer/standard-printer');

let mainWindow;
let dbManager;
let barcodeGenerator;
let thermalPrinter;

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

  // Initialize thermal printer
  thermalPrinter = new ThermalPrinter();
  // thermalPrinter = new StandardPrinter();

  // Add sample data if database is empty
  await addSampleData();

  // Add sample data if database is empty
  await addSampleData();

  // Setup IPC handlers
  setupIPCHandlers();

  // Add sample data if needed
  async function addSampleData() {
    try {
      // Check if we have any products
      const existingProducts = dbManager.all('SELECT COUNT(*) as count FROM products WHERE is_active = 1');
      
      if (existingProducts[0].count === 0) {
        console.log('Adding sample products...');
        
        // Add sample products with stock
        const sampleProducts = [
          {
            product_name: 'Black Pant',
            category: 'Clothing',
            selling_price: 899,
            stock_quantity: 36,
            min_stock_level: 10
          },
          {
            product_name: 'Blue Shirt',
            category: 'Clothing', 
            selling_price: 599,
            stock_quantity: 15,
            min_stock_level: 8
          },
          {
            product_name: 'White Sneakers',
            category: 'Footwear',
            selling_price: 1299,
            stock_quantity: 5,
            min_stock_level: 12
          },
          {
            product_name: 'Coffee Mug',
            category: 'Home & Kitchen',
            selling_price: 299,
            stock_quantity: 0,
            min_stock_level: 20
          },
          {
            product_name: 'Notebook',
            category: 'Stationery',
            selling_price: 150,
            stock_quantity: 45,
            min_stock_level: 15
          }
        ];

        for (const product of sampleProducts) {
          // Generate a simple barcode
          const barcode = 'SB' + Date.now() + Math.floor(Math.random() * 1000);
          
          dbManager.run(
            `INSERT INTO products (barcode, product_name, category, selling_price, stock_quantity, min_stock_level)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [barcode, product.product_name, product.category, product.selling_price, product.stock_quantity, product.min_stock_level]
          );
        }
        
        console.log('Sample products added successfully');
        
        // Save database
        const path = require('path');
        const dbPath = path.join(app.getPath('userData'), 'billing.db');
        dbManager.saveDatabase(dbPath);
      }
    } catch (error) {
      console.error('Error adding sample data:', error);
    }
  }

  // Load app
  // Check if running in production or development
if (app.isPackaged) {
  // Production - load from built files
  mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
} else {
  // Development - load from vite dev server
  mainWindow.loadURL('http://localhost:5173');
  mainWindow.webContents.openDevTools();
}
  // mainWindow.webContents.openDevTools();
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

  // Generate barcode image
  ipcMain.handle('barcode:generateImage', async (event, value, type = 'CODE128') => {
    try {
      // This will be handled in the renderer process using jsbarcode
      // Return the barcode data for client-side generation
      return {
        success: true,
        barcode: value,
        type: type,
        message: 'Barcode data prepared for client-side generation'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
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

  // ===== THERMAL PRINTER HANDLERS =====
  
  // Get available printers
  ipcMain.handle('printer:getAvailable', async () => {
    try {
      const result = await thermalPrinter.getAvailablePrinters();
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Initialize printer
  ipcMain.handle('printer:initialize', async (event, printerName) => {
    try {
      const result = await thermalPrinter.initialize(printerName);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Test printer connection
  ipcMain.handle('printer:testConnection', async () => {
    try {
      const result = await thermalPrinter.testConnection();
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get printer status
  ipcMain.handle('printer:getStatus', async () => {
    try {
      const status = thermalPrinter.getStatus();
      return { success: true, data: status };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Print bill
  ipcMain.handle('printer:printBill', async (event, billData, shopInfo) => {
    try {
      console.log('printBill called with shopInfo:', shopInfo);
      
      // Use shopInfo passed from renderer (from localStorage)
      // If not provided, create a default object
      const finalShopInfo = shopInfo || {
        shop_name: 'My Shop',
        address: '',
        phone: '',
        logo: '',
        footer_message: 'Thank you for your business!',
        include_logo: true
      };
      
      const result = await thermalPrinter.printBill(billData, finalShopInfo);
      return result;
    } catch (error) {
      console.error('Print bill error:', error);
      return { success: false, error: error.message };
    }
  });

  // ===== LABEL PRINTING HANDLERS =====
  
  // Print single label
  ipcMain.handle('label:print', async (event, productData, labelSettings) => {
    try {
      const result = await thermalPrinter.printLabel(productData, labelSettings);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Print multiple labels (bulk printing)
  ipcMain.handle('label:printBulk', async (event, productsData, labelSettings) => {
    try {
      const result = await thermalPrinter.printLabels(productsData, labelSettings);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get available label sizes
  ipcMain.handle('label:getSizes', async () => {
    try {
      const sizes = thermalPrinter.getLabelSizes();
      return { success: true, data: sizes };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get available label templates
  ipcMain.handle('label:getTemplates', async () => {
    try {
      const templates = thermalPrinter.getLabelTemplates();
      return { success: true, data: templates };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ===== LABEL PRINTING HANDLERS =====
  
  // Print single label
  ipcMain.handle('label:print', async (event, productData, labelSettings) => {
    try {
      const result = await thermalPrinter.printLabel(productData, labelSettings);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Print multiple labels (bulk printing)
  ipcMain.handle('label:printBulk', async (event, productsData, labelSettings) => {
    try {
      const result = await thermalPrinter.printLabels(productsData, labelSettings);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get available label sizes
  ipcMain.handle('label:getSizes', async () => {
    try {
      const sizes = thermalPrinter.getLabelSizes();
      return { success: true, data: sizes };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get available label templates
  ipcMain.handle('label:getTemplates', async () => {
    try {
      const templates = thermalPrinter.getLabelTemplates();
      return { success: true, data: templates };
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
          payment_mode, paid_amount, balance_amount, notes,
          is_return, original_bill_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          billData.notes || null,
          billData.is_return || 0,
          billData.original_bill_id || null
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

  // Search bills
  ipcMain.handle('bills:search', async (event, query) => {
    try {
      let sql = `
        SELECT b.*
        FROM bills b
        WHERE (
          b.bill_number LIKE ? OR 
          b.customer_name LIKE ? OR 
          b.customer_phone LIKE ? OR 
          CAST(b.total_amount AS TEXT) LIKE ? OR
          DATE(b.bill_date) LIKE ?
        )
        ORDER BY b.bill_date DESC
        LIMIT 50
      `;
      
      const searchPattern = `%${query}%`;
      const bills = dbManager.all(sql, [
        searchPattern, searchPattern, searchPattern, 
        searchPattern, searchPattern
      ]);
      
      // Get items for each bill
      const billsWithItems = [];
      for (const bill of bills) {
        const items = dbManager.all('SELECT * FROM bill_items WHERE bill_id = ?', [bill.bill_id]);
        billsWithItems.push({
          ...bill,
          items: items
        });
      }
      
      return { success: true, data: billsWithItems };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Update bill
  ipcMain.handle('bills:update', async (event, billId, updateData) => {
    try {
      // Get the current bill to calculate balance
      const currentBill = dbManager.get('SELECT * FROM bills WHERE bill_id = ?', [billId]);
      
      if (!currentBill) {
        return { success: false, error: 'Bill not found' };
      }

      // Calculate new balance based on paid amount
      const newPaidAmount = updateData.paid_amount || currentBill.paid_amount;
      const newBalanceAmount = currentBill.total_amount - newPaidAmount;

      // Update the bill
      dbManager.run(
        `UPDATE bills SET 
          customer_name = ?,
          customer_phone = ?,
          payment_mode = ?,
          notes = ?,
          paid_amount = ?,
          balance_amount = ?
        WHERE bill_id = ?`,
        [
          updateData.customer_name || null,
          updateData.customer_phone || null,
          updateData.payment_method || currentBill.payment_mode,
          updateData.comment || null,
          newPaidAmount,
          newBalanceAmount,
          billId
        ]
      );

      // Save database
      const path = require('path');
      const dbPath = path.join(app.getPath('userData'), 'billing.db');
      dbManager.saveDatabase(dbPath);

      return { 
        success: true, 
        message: 'Bill updated successfully',
        data: {
          paid_amount: newPaidAmount,
          balance_amount: newBalanceAmount
        }
      };
    } catch (error) {
      console.error('Bill update error:', error);
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

  // Sales report by date range
  ipcMain.handle('reports:salesByDateRange', async (event, startDate, endDate) => {
    try {
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
         WHERE DATE(bill_date) >= DATE(?) AND DATE(bill_date) <= DATE(?)`,
        [startDate, endDate]
      );

      // Top selling items
      const topItems = dbManager.all(
        `SELECT 
          bi.product_name,
          SUM(bi.quantity) as total_quantity,
          SUM(bi.total_price) as total_amount
         FROM bill_items bi
         JOIN bills b ON bi.bill_id = b.bill_id
         WHERE DATE(b.bill_date) >= DATE(?) AND DATE(b.bill_date) <= DATE(?)
         GROUP BY bi.product_name
         ORDER BY total_quantity DESC
         LIMIT 10`,
        [startDate, endDate]
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

  // Inventory report
  ipcMain.handle('reports:inventoryReport', async () => {
    try {
      // Get all products
      const allProducts = dbManager.all('SELECT product_id, product_name, stock_quantity, min_stock_level, category, selling_price FROM products WHERE is_active = 1 ORDER BY product_name');
      console.log('All products:', allProducts);

      // Low stock products
      const lowStockProducts = dbManager.all(
        `SELECT product_id, product_name, stock_quantity, min_stock_level, category
         FROM products 
         WHERE is_active = 1 
         AND stock_quantity <= min_stock_level 
         AND stock_quantity > 0
         ORDER BY stock_quantity ASC`
      );

      console.log('Low stock products:', lowStockProducts);

      // Out of stock products
      const outOfStockProducts = dbManager.all(
        `SELECT product_id, product_name, category
         FROM products 
         WHERE is_active = 1 
         AND stock_quantity = 0
         ORDER BY product_name`
      );

      console.log('Out of stock products:', outOfStockProducts);

      return {
        success: true,
        data: {
          allProducts: allProducts || [],
          lowStockProducts: lowStockProducts || [],
          outOfStockProducts: outOfStockProducts || []
        }
      };
    } catch (error) {
      console.error('Inventory report error:', error);
      return { success: false, error: error.message };
    }
  });

  // Financial report
  ipcMain.handle('reports:financialReport', async (event, startDate, endDate) => {
    try {
      // Get sales data for the period
      const salesData = dbManager.get(
        `SELECT 
          SUM(total_amount) as total_revenue,
          COUNT(*) as total_bills,
          AVG(total_amount) as average_bill_value
         FROM bills 
         WHERE DATE(bill_date) >= DATE(?) AND DATE(bill_date) <= DATE(?)`,
        [startDate, endDate]
      );

      // Calculate previous period for comparison
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      const periodDays = Math.ceil((endDateObj - startDateObj) / (1000 * 60 * 60 * 24)) + 1;
      
      const prevStartDate = new Date(startDateObj.getTime() - (periodDays * 24 * 60 * 60 * 1000))
        .toISOString().split('T')[0];
      const prevEndDate = new Date(endDateObj.getTime() - (periodDays * 24 * 60 * 60 * 1000))
        .toISOString().split('T')[0];

      const previousPeriodData = dbManager.get(
        `SELECT SUM(total_amount) as total_revenue
         FROM bills 
         WHERE DATE(bill_date) >= DATE(?) AND DATE(bill_date) <= DATE(?)`,
        [prevStartDate, prevEndDate]
      );

      // Calculate profit (simplified - assuming 30% margin)
      const totalRevenue = salesData?.total_revenue || 0;
      const totalProfit = totalRevenue * 0.3; // 30% profit margin assumption
      const totalTax = totalRevenue * 0.05; // 5% tax assumption

      const currentPeriod = totalRevenue;
      const previousPeriod = previousPeriodData?.total_revenue || 0;
      const growthPercentage = previousPeriod > 0 
        ? ((currentPeriod - previousPeriod) / previousPeriod) * 100 
        : 0;

      return {
        success: true,
        data: {
          totalRevenue,
          totalProfit,
          totalTax,
          averageBillValue: salesData?.average_bill_value || 0,
          periodComparison: {
            currentPeriod,
            previousPeriod,
            growthPercentage
          }
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ===== RETURNS HANDLERS =====
  
  // Create return transaction
  ipcMain.handle('returns:create', async (event, returnData) => {
    try {
      console.log('=== RETURN PROCESSING DEBUG ===');
      console.log('Return data received:', JSON.stringify(returnData, null, 2));
      
      // Validate input data
      if (!returnData.return_items || !Array.isArray(returnData.return_items)) {
        throw new Error('Invalid return items data');
      }
      if (!returnData.exchange_items || !Array.isArray(returnData.exchange_items)) {
        throw new Error('Invalid exchange items data');
      }
      
      // Calculate totals with validation
      const totalReturnValue = returnData.return_items.reduce((sum, item) => {
        const itemTotal = item.quantity * item.unit_price;
        console.log(`Return item: ${item.product_name}, Qty: ${item.quantity}, Unit: ${item.unit_price}, Total: ${itemTotal}`);
        return sum + itemTotal;
      }, 0);
      
      const totalExchangeValue = returnData.exchange_items.reduce((sum, item) => {
        const itemTotal = item.quantity * item.unit_price;
        console.log(`Exchange item: ${item.product_name}, Qty: ${item.quantity}, Unit: ${item.unit_price}, Total: ${itemTotal}`);
        return sum + itemTotal;
      }, 0);
      
      const balanceAmount = totalExchangeValue - totalReturnValue;
      
      console.log(`Totals - Return: ${totalReturnValue}, Exchange: ${totalExchangeValue}, Balance: ${balanceAmount}`);
      
      // Start transaction
      dbManager.beginTransaction();
      
      let returnTransaction;
      
      try {
        // Insert return transaction
        const result = dbManager.run(
          `INSERT INTO return_transactions (
            original_bill_id, customer_name, customer_phone,
            return_reason, total_return_value, total_exchange_value,
            balance_amount, status, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            returnData.original_bill_id,
            returnData.customer_name || null,
            returnData.customer_phone || null,
            returnData.return_reason || null,
            totalReturnValue,
            totalExchangeValue,
            balanceAmount,
            'COMPLETED',
            returnData.notes || null
          ]
        );

        console.log('Return transaction inserted with ID:', result.lastID);

        // Get the inserted return ID
        returnTransaction = dbManager.get(
          'SELECT * FROM return_transactions WHERE return_id = ?',
          [result.lastID]
        );

        console.log('Return transaction created:', returnTransaction);

        // Insert return items
        for (const item of returnData.return_items) {
          console.log('Inserting return item:', item);
          
          // Get current stock before return
          const currentProduct = dbManager.get(
            'SELECT stock_quantity FROM products WHERE product_id = ?',
            [item.product_id]
          );
          
          if (currentProduct) {
            console.log(`Current stock for ${item.product_name}: ${currentProduct.stock_quantity}`);
          }
          
          const itemResult = dbManager.run(
            `INSERT INTO return_items (
              return_id, product_id, product_name, product_code, barcode,
              quantity, unit_price, total_price
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              returnTransaction.return_id,
              item.product_id || null,
              item.product_name,
              item.product_code || null,
              item.barcode || null,
              item.quantity,
              item.unit_price,
              item.total_price
            ]
          );
          
          console.log('Return item inserted with ID:', itemResult.lastID);
        }

        // Insert exchange items
        for (const item of returnData.exchange_items) {
          console.log('Inserting exchange item:', item);
          
          // Get current stock before exchange
          const currentProduct = dbManager.get(
            'SELECT stock_quantity FROM products WHERE product_id = ?',
            [item.product_id]
          );
          
          if (currentProduct) {
            console.log(`Current stock for ${item.product_name}: ${currentProduct.stock_quantity}`);
          }
          
          const itemResult = dbManager.run(
            `INSERT INTO exchange_items (
              return_id, product_id, product_name, product_code, barcode,
              quantity, unit_price, total_price
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              returnTransaction.return_id,
              item.product_id || null,
              item.product_name,
              item.product_code || null,
              item.barcode || null,
              item.quantity,
              item.unit_price,
              item.total_price
            ]
          );
          
          console.log('Exchange item inserted with ID:', itemResult.lastID);
        }
        
        // Commit transaction
        dbManager.commitTransaction();
        console.log('Return transaction committed successfully');
        
      } catch (error) {
        console.error('Transaction error, rolling back:', error);
        dbManager.rollbackTransaction();
        throw error;
      }

      // Save database
      const path = require('path');
      const dbPath = path.join(app.getPath('userData'), 'billing.db');
      dbManager.saveDatabase(dbPath);
      
      console.log('=== RETURN PROCESSING COMPLETE ===');

      return { 
        success: true, 
        message: 'Return processed successfully',
        returnId: returnTransaction.return_id
      };
    } catch (error) {
      console.error('Return creation error:', error);
      return { success: false, error: error.message };
    }
  });

  // Get all returns
  ipcMain.handle('returns:getAll', async (event, filters = {}) => {
    try {
      let sql = `
        SELECT rt.*, 
               GROUP_CONCAT(ri.product_name) as return_item_names,
               GROUP_CONCAT(ei.product_name) as exchange_item_names
        FROM return_transactions rt
        LEFT JOIN return_items ri ON rt.return_id = ri.return_id
        LEFT JOIN exchange_items ei ON rt.return_id = ei.return_id
        WHERE 1=1
      `;
      const params = [];

      if (filters.startDate) {
        sql += ' AND DATE(rt.return_date) >= DATE(?)';
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        sql += ' AND DATE(rt.return_date) <= DATE(?)';
        params.push(filters.endDate);
      }

      if (filters.status) {
        sql += ' AND rt.status = ?';
        params.push(filters.status);
      }

      sql += ' GROUP BY rt.return_id ORDER BY rt.return_date DESC LIMIT 100';

      const returns = dbManager.all(sql, params);
      
      // Get detailed return data with items
      const detailedReturns = [];
      for (const returnTransaction of returns) {
        const returnItems = dbManager.all('SELECT * FROM return_items WHERE return_id = ?', [returnTransaction.return_id]);
        const exchangeItems = dbManager.all('SELECT * FROM exchange_items WHERE return_id = ?', [returnTransaction.return_id]);
        
        detailedReturns.push({
          ...returnTransaction,
          return_items: returnItems,
          exchange_items: exchangeItems
        });
      }
      
      return { success: true, data: detailedReturns };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get return by ID
  ipcMain.handle('returns:getById', async (event, id) => {
    try {
      const returnTransaction = dbManager.get('SELECT * FROM return_transactions WHERE return_id = ?', [id]);
      if (returnTransaction) {
        const returnItems = dbManager.all('SELECT * FROM return_items WHERE return_id = ?', [id]);
        const exchangeItems = dbManager.all('SELECT * FROM exchange_items WHERE return_id = ?', [id]);
        
        returnTransaction.return_items = returnItems;
        returnTransaction.exchange_items = exchangeItems;
      }
      return { success: true, data: returnTransaction };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Update return status
  ipcMain.handle('returns:updateStatus', async (event, id, status) => {
    try {
      dbManager.run(
        'UPDATE return_transactions SET status = ? WHERE return_id = ?',
        [status, id]
      );

      // Save database
      const path = require('path');
      const dbPath = path.join(app.getPath('userData'), 'billing.db');
      dbManager.saveDatabase(dbPath);

      return { success: true, message: 'Return status updated successfully' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Print return receipt
  ipcMain.handle('returns:printReceipt', async (event, returnId) => {
    try {
      const returnTransaction = dbManager.get('SELECT * FROM return_transactions WHERE return_id = ?', [returnId]);
      const returnItems = dbManager.all('SELECT * FROM return_items WHERE return_id = ?', [returnId]);
      const exchangeItems = dbManager.all('SELECT * FROM exchange_items WHERE return_id = ?', [returnId]);
      const originalBill = dbManager.get('SELECT * FROM bills WHERE bill_id = ?', [returnTransaction.original_bill_id]);
      const shopInfo = dbManager.get('SELECT * FROM shop_info WHERE shop_id = 1');
      
      if (!returnTransaction) {
        return { success: false, error: 'Return transaction not found' };
      }

      // Create receipt data
      const receiptData = {
        return_number: `RET-${returnTransaction.return_id.toString().padStart(6, '0')}`,
        return_date: returnTransaction.return_date,
        original_bill_number: originalBill?.bill_number || 'N/A',
        original_bill_date: originalBill?.bill_date || 'N/A',
        customer_name: returnTransaction.customer_name || 'Walk-in Customer',
        customer_phone: returnTransaction.customer_phone || '',
        return_reason: returnTransaction.return_reason || '',
        notes: returnTransaction.notes || '',
        return_items: returnItems,
        exchange_items: exchangeItems,
        summary: {
          total_return_value: returnTransaction.total_return_value,
          total_exchange_value: returnTransaction.total_exchange_value,
          balance_amount: returnTransaction.balance_amount,
          balance_type: returnTransaction.balance_amount > 0 ? 'Customer Pays' : 'Customer Gets Change'
        },
        shop_info: shopInfo
      };

      // Print using thermal printer
      const result = await thermalPrinter.printReturn(receiptData);
      return result;
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