const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Test function
  test: () => ipcRenderer.invoke('test'),
  
  // Products API
  products: {
    getAll: () => ipcRenderer.invoke('products:getAll'),
    getById: (id) => ipcRenderer.invoke('products:getById', id),
    create: (data) => ipcRenderer.invoke('products:create', data),
    update: (id, data) => ipcRenderer.invoke('products:update', id, data),
    delete: (id) => ipcRenderer.invoke('products:delete', id),
    search: (query) => ipcRenderer.invoke('products:search', query),
    findByBarcode: (barcode) => ipcRenderer.invoke('products:findByBarcode', barcode),
  },
  
  // Barcode API
  barcode: {
    generateUnique: (category) => ipcRenderer.invoke('barcode:generateUnique', category),
    generateImage: (value, type) => ipcRenderer.invoke('barcode:generateImage', value, type),
    onScan: (callback) => ipcRenderer.on('barcode-scanned', callback),
    removeScanListener: (callback) => ipcRenderer.removeListener('barcode-scanned', callback),
  },
  
  // Bills API
  bills: {
    create: (data) => ipcRenderer.invoke('bills:create', data),
    getAll: (filters) => ipcRenderer.invoke('bills:getAll', filters),
    getById: (id) => ipcRenderer.invoke('bills:getById', id),
    getToday: () => ipcRenderer.invoke('bills:getToday'),
    update: (id, data) => ipcRenderer.invoke('bills:update', id, data),
    search: (query) => ipcRenderer.invoke('bills:search', query),
  },
  
  // Returns API
  returns: {
    create: (data) => ipcRenderer.invoke('returns:create', data),
    getAll: (filters) => ipcRenderer.invoke('returns:getAll', filters),
    getById: (id) => ipcRenderer.invoke('returns:getById', id),
    updateStatus: (id, status) => ipcRenderer.invoke('returns:updateStatus', id, status),
    printReceipt: (id) => ipcRenderer.invoke('returns:printReceipt', id),
  },
  
  // Customers API
  customers: {
    getAll: () => ipcRenderer.invoke('customers:getAll'),
    create: (data) => ipcRenderer.invoke('customers:create', data),
    search: (query) => ipcRenderer.invoke('customers:search', query),
  },
  
  // Reports API
  reports: {
    dailySales: (date) => ipcRenderer.invoke('reports:dailySales', date),
    salesByDateRange: (startDate, endDate) => ipcRenderer.invoke('reports:salesByDateRange', startDate, endDate),
    inventoryReport: () => ipcRenderer.invoke('reports:inventoryReport'),
    financialReport: (startDate, endDate) => ipcRenderer.invoke('reports:financialReport', startDate, endDate),
    stockReport: () => ipcRenderer.invoke('reports:stockReport'),
  },
  
  // Settings API
  settings: {
    get: (key) => ipcRenderer.invoke('settings:get', key),
    set: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  },
  
  // Thermal Printer API
  printer: {
    getAvailable: () => ipcRenderer.invoke('printer:getAvailable'),
    initialize: (printerName) => ipcRenderer.invoke('printer:initialize', printerName),
    testConnection: () => ipcRenderer.invoke('printer:testConnection'),
    getStatus: () => ipcRenderer.invoke('printer:getStatus'),
    printBill: (billData, shopInfo) => ipcRenderer.invoke('printer:printBill', billData, shopInfo),
  },

  // Label Printing API
  label: {
    print: (productData, labelSettings) => ipcRenderer.invoke('label:print', productData, labelSettings),
    printBulk: (productsData, labelSettings) => ipcRenderer.invoke('label:printBulk', productsData, labelSettings),
    getSizes: () => ipcRenderer.invoke('label:getSizes'),
    getTemplates: () => ipcRenderer.invoke('label:getTemplates'),
  },

  // Label Printing API
  label: {
    print: (productData, labelSettings) => ipcRenderer.invoke('label:print', productData, labelSettings),
    printBulk: (productsData, labelSettings) => ipcRenderer.invoke('label:printBulk', productsData, labelSettings),
    getSizes: () => ipcRenderer.invoke('label:getSizes'),
    getTemplates: () => ipcRenderer.invoke('label:getTemplates'),
  },
});