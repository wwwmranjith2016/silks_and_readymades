const { exec } = require('child_process');
const os = require('os');

class ThermalPrinter {
  constructor() {
    this.printerName = '';
    this.isConnected = false;
  }

  /**
   * Initialize thermal printer connection
   */
  async initialize(printerName) {
    try {
      this.printerName = printerName;
      
      // Test connection by sending a simple command
      const testResult = await this.testConnection();
      
      if (testResult.success) {
        this.isConnected = true;
        console.log(`Thermal printer "${printerName}" connected successfully`);
        return { success: true, message: 'Printer connected successfully' };
      } else {
        return testResult;
      }
    } catch (error) {
      console.error('Printer initialization error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Test printer connection
   */
  async testConnection() {
    try {
      const testCommand = this.buildTestCommand();
      const result = await this.executeCommand(testCommand);
      
      if (result.success) {
        return { success: true, message: 'Connection test successful' };
      } else {
        return { success: false, error: 'Connection test failed' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get available printers
   */
  async getAvailablePrinters() {
    try {
      const platform = os.platform();
      let command = '';

      if (platform === 'win32') {
        // Windows: Use wmic to get printer list
        command = 'wmic printer where "Local=\'TRUE\'" get Name,ShareName /format:csv';
      } else if (platform === 'darwin') {
        // macOS: Use lpstat to get printer list
        command = 'lpstat -p';
      } else {
        // Linux: Use lpstat or CUPS
        command = 'lpstat -p';
      }

      const result = await this.executeCommand(command);
      
      if (result.success) {
        const printers = this.parsePrinterList(result.output, platform);
        return { success: true, printers };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Print bill using thermal printer
   */
  async printBill(billData, shopInfo) {
    try {
      if (!this.isConnected) {
        return { success: false, error: 'Printer not connected' };
      }

      // Build thermal bill content
      const billContent = this.buildThermalBill(billData, shopInfo);
      
      // Convert to ESC/POS commands
      const escPosData = this.convertToESCPOS(billContent);
      
      // Send to printer
      const result = await this.sendToPrinter(escPosData);
      
      if (result.success) {
        console.log(`Bill ${billData.bill_number} printed successfully`);
        return { success: true, message: 'Bill printed successfully' };
      } else {
        return result;
      }
    } catch (error) {
      console.error('Bill printing error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Build thermal bill content
   */
  buildThermalBill(billData, shopInfo) {
    const lines = [];
    
    // Header
    lines.push({ type: 'center', text: shopInfo.shop_name || 'My Shop', bold: true });
    if (shopInfo.owner_name) {
      lines.push({ type: 'center', text: shopInfo.owner_name });
    }
    if (shopInfo.address) {
      lines.push({ type: 'center', text: shopInfo.address });
    }
    if (shopInfo.phone) {
      lines.push({ type: 'center', text: `Phone: ${shopInfo.phone}` });
    }
    
    lines.push({ type: 'line', text: '----------------------------------------' });
    
    // Bill details
    lines.push({ type: 'left', text: `Bill No: ${billData.bill_number}` });
    lines.push({ type: 'left', text: `Date: ${this.formatDate(billData.bill_date)}` });
    
    if (billData.customer_name) {
      lines.push({ type: 'left', text: `Customer: ${billData.customer_name}` });
    }
    if (billData.customer_phone) {
      lines.push({ type: 'left', text: `Phone: ${billData.customer_phone}` });
    }
    
    lines.push({ type: 'line', text: '----------------------------------------' });
    
    // Items header
    lines.push({ type: 'left', text: 'ITEMS', bold: true });
    lines.push({ type: 'line', text: '----------------------------------------' });
    
    // Items
    billData.items.forEach(item => {
      lines.push({ type: 'left', text: `${item.product_name}` });
      lines.push({ 
        type: 'row', 
        text: `${item.quantity} x ₹${item.unit_price.toFixed(2)} = ₹${item.total_price.toFixed(2)}` 
      });
    });
    
    lines.push({ type: 'line', text: '----------------------------------------' });
    
    // Totals
    lines.push({ 
      type: 'row', 
      text: `Subtotal: ₹${billData.subtotal.toFixed(2)}` 
    });
    
    if (billData.discount_amount > 0) {
      lines.push({ 
        type: 'row', 
        text: `Discount (${billData.discount_percentage}%): -₹${billData.discount_amount.toFixed(2)}` 
      });
    }
    
    lines.push({ 
      type: 'row', 
      text: `TOTAL: ₹${billData.total_amount.toFixed(2)}`, 
      bold: true 
    });
    
    lines.push({ type: 'line', text: '----------------------------------------' });
    
    // Payment info
    lines.push({ type: 'row', text: `Payment: ${billData.payment_mode}` });
    lines.push({ type: 'row', text: `Paid: ₹${billData.paid_amount.toFixed(2)}` });
    
    if (billData.balance_amount > 0) {
      lines.push({ type: 'row', text: `Balance: ₹${billData.balance_amount.toFixed(2)}` });
    }
    
    lines.push({ type: 'line', text: '----------------------------------------' });
    
    // Footer
    lines.push({ type: 'center', text: 'Thank you for your business!' });
    lines.push({ type: 'center', text: 'Please visit again' });
    lines.push({ type: 'center', text: '' });
    
    return lines;
  }

  /**
   * Convert content to ESC/POS commands
   */
  convertToESCPOS(content) {
    let commands = Buffer.alloc(0);
    
    // Initialize printer
    const init = Buffer.from([0x1B, 0x40]);
    commands = Buffer.concat([commands, init]);
    
    content.forEach(line => {
      switch (line.type) {
        case 'center':
          commands = Buffer.concat([commands, this.escapeSequence('CENTER')]);
          commands = Buffer.concat([commands, this.formatText(line)]);
          break;
        case 'left':
          commands = Buffer.concat([commands, this.escapeSequence('LEFT')]);
          commands = Buffer.concat([commands, this.formatText(line)]);
          break;
        case 'row':
          commands = Buffer.concat([commands, this.escapeSequence('LEFT')]);
          commands = Buffer.concat([commands, this.formatText(line)]);
          break;
        case 'line':
          commands = Buffer.concat([commands, this.formatLine(line.text)]);
          break;
      }
      
      // Add line break
      commands = Buffer.concat([commands, Buffer.from([0x0A])]);
    });
    
    // Cut paper
    commands = Buffer.concat([commands, Buffer.from([0x1D, 0x56, 0x00])]);
    
    return commands;
  }

  /**
   * Format text with ESC/POS commands
   */
  formatText(line) {
    let text = Buffer.from(line.text + '\n', 'utf8');
    
    if (line.bold) {
      const boldOn = Buffer.from([0x1B, 0x45, 0x01]);
      const boldOff = Buffer.from([0x1B, 0x45, 0x00]);
      text = Buffer.concat([boldOn, text, boldOff]);
    }
    
    return text;
  }

  /**
   * Format line separator
   */
  formatLine(lineText) {
    return Buffer.from(lineText + '\n', 'utf8');
  }

  /**
   * Generate ESC/POS escape sequences
   */
  escapeSequence(alignment) {
    switch (alignment) {
      case 'LEFT':
        return Buffer.from([0x1B, 0x61, 0x00]);
      case 'CENTER':
        return Buffer.from([0x1B, 0x61, 0x01]);
      case 'RIGHT':
        return Buffer.from([0x1B, 0x61, 0x02]);
      default:
        return Buffer.from([0x1B, 0x61, 0x00]);
    }
  }

  /**
   * Generate barcode commands for thermal printer
   */
  generateBarcodeCommands(barcodeValue) {
    let commands = Buffer.alloc(0);
    
    try {
      // Set barcode height (0x1D, 0x68, 0xNN) - NN is height in dots
      const barcodeHeight = Buffer.from([0x1D, 0x68, 0x40]); // 64 dots height
      commands = Buffer.concat([commands, barcodeHeight]);
      
      // Set barcode width (0x1D, 0x77, 0xNN) - NN is width multiplier
      const barcodeWidth = Buffer.from([0x1D, 0x77, 0x02]); // 2x width
      commands = Buffer.concat([commands, barcodeWidth]);
      
      // Set HRI (Human Readable Interpretation) position
      // 0x1D, 0x48, 0x00 = No HRI
      // 0x1D, 0x48, 0x01 = HRI above barcode
      // 0x1D, 0x48, 0x02 = HRI below barcode
      // 0x1D, 0x48, 0x03 = HRI both above and below
      const hriPosition = Buffer.from([0x1D, 0x48, 0x02]); // HRI below barcode
      commands = Buffer.concat([commands, hriPosition]);
      
      // Start CODE128 barcode command
      // GS k m d1...dk NUL - Print barcode
      // m = 0x04 for CODE128
      const barcodeData = Buffer.from(barcodeValue, 'utf8');
      
      // Build the complete barcode command
      const barcodeStart = Buffer.from([0x1D, 0x6B, 0x04]); // Start CODE128 barcode
      commands = Buffer.concat([commands, barcodeStart]);
      
      // Add barcode data length and data
      const lengthByte = Buffer.from([barcodeData.length]);
      commands = Buffer.concat([commands, lengthByte, barcodeData]);
      
      // Add NUL terminator
      const terminator = Buffer.from([0x00]);
      commands = Buffer.concat([commands, terminator]);
      
      // Add line break after barcode
      commands = Buffer.concat([commands, Buffer.from([0x0A])]);
      
      return commands;
    } catch (error) {
      console.error('Error generating barcode commands:', error);
      // Fallback to printing barcode as text
      return this.formatText({ text: barcodeValue, bold: false });
    }
  }

  /**
   * Execute system command
   */
  executeCommand(command) {
    return new Promise((resolve) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          resolve({ success: false, error: error.message, output: stderr });
        } else {
          resolve({ success: true, output: stdout });
        }
      });
    });
  }

  /**
   * Send data to printer
   */
  async sendToPrinter(data) {
    try {
      // For now, we'll save to a file for testing
      // In production, this would send to actual printer
      const fs = require('fs');
      const path = require('path');
      const printFile = path.join(os.tmpdir(), `thermal_print_${Date.now()}.bin`);
      
      fs.writeFileSync(printFile, data);
      console.log(`Print data saved to: ${printFile}`);
      
      // Simulate printing success
      return { success: true, message: 'Print command sent successfully' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Parse printer list from system command output
   */
  parsePrinterList(output, platform) {
    const printers = [];
    const lines = output.split('\n').filter(line => line.trim());
    
    lines.forEach(line => {
      if (line.trim() && !line.includes('Name') && !line.includes('Name,')) {
        const parts = line.split(',');
        if (parts.length >= 2) {
          const name = parts[1]?.trim();
          if (name && name !== '') {
            printers.push({ name, type: 'thermal' });
          }
        }
      }
    });
    
    return printers;
  }

  /**
   * Format date for thermal printing
   */
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Build test command
   */
  buildTestCommand() {
    const platform = os.platform();
    
    if (platform === 'win32') {
      return `echo "Test" > \\\\"${this.printerName}\\\\"`;
    } else {
      return `echo "Test" | lpr -P "${this.printerName}"`;
    }
  }

  /**
   * Get printer status
   */
  getStatus() {
    return {
      connected: this.isConnected,
      printerName: this.printerName,
      ready: this.isConnected
    };
  }

  /**
   * Print single product label
   */
  async printLabel(productData, labelSettings = {}) {
    try {
      if (!this.isConnected) {
        return { success: false, error: 'Printer not connected' };
      }

      // Default label settings
      const settings = {
        size: '2x1',
        quantity: 1,
        template: 'basic',
        ...labelSettings
      };

      // Build label content with template
      const labelContent = this.buildLabelContent(productData, settings.template);
      
      // Convert to ESC/POS commands for labels
      const escPosData = this.convertLabelToESCPOS(labelContent, settings);
      
      // Send to printer
      const result = await this.sendToPrinter(escPosData);
      
      if (result.success) {
        console.log(`Label for ${productData.product_name} printed successfully`);
        return { success: true, message: 'Label printed successfully' };
      } else {
        return result;
      }
    } catch (error) {
      console.error('Label printing error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Print multiple labels (bulk printing)
   */
  async printLabels(productsData, labelSettings = {}) {
    try {
      if (!this.isConnected) {
        return { success: false, error: 'Printer not connected' };
      }

      if (!productsData || productsData.length === 0) {
        return { success: false, error: 'No products to print' };
      }

      // Default label settings
      const settings = {
        size: '2x1',
        template: 'basic',
        ...labelSettings
      };

      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (const productData of productsData) {
        try {
          const quantity = productData.labelQuantity || 1;
          
          for (let i = 0; i < quantity; i++) {
            // Build label content with template
            const labelContent = this.buildLabelContent(productData, settings.template);
            
            // Convert to ESC/POS commands for labels
            const escPosData = this.convertLabelToESCPOS(labelContent, settings);
            
            // Send to printer
            const result = await this.sendToPrinter(escPosData);
            
            if (result.success) {
              successCount++;
            } else {
              errorCount++;
              errors.push(`Failed to print label for ${productData.product_name}: ${result.error}`);
            }
            
            // Small delay between labels to prevent printer buffer overflow
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (error) {
          errorCount++;
          errors.push(`Error printing label for ${productData.product_name}: ${error.message}`);
        }
      }

      const message = `Bulk printing completed: ${successCount} successful, ${errorCount} failed`;
      console.log(message);
      
      return { 
        success: errorCount === 0, 
        message,
        successCount,
        errorCount,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      console.error('Bulk label printing error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Build label content for product with template
   */
  buildLabelContent(productData, templateId = 'basic') {
    const templates = {
      basic: this.buildBasicTemplate(productData),
      detailed: this.buildDetailedTemplate(productData),
      minimal: this.buildMinimalTemplate(productData),
      price: this.buildPriceTemplate(productData)
    };
    
    return templates[templateId] || templates.basic;
  }

  /**
   * Basic template: Name + Price + Barcode
   */
  buildBasicTemplate(productData) {
    const lines = [];
    const maxNameLength = 20;
    const productName = productData.product_name.length > maxNameLength 
      ? productData.product_name.substring(0, maxNameLength - 3) + '...'
      : productData.product_name;
    
    lines.push({ type: 'center', text: productName, bold: true });
    lines.push({ type: 'center', text: `₹${parseFloat(productData.selling_price).toFixed(2)}`, bold: true });
    lines.push({ type: 'barcode', barcode: productData.barcode });
    
    return lines;
  }

  /**
   * Detailed template: Name + Category + Price + Barcode + Stock
   */
  buildDetailedTemplate(productData) {
    const lines = [];
    const maxNameLength = 18;
    const productName = productData.product_name.length > maxNameLength 
      ? productData.product_name.substring(0, maxNameLength - 3) + '...'
      : productData.product_name;
    
    lines.push({ type: 'center', text: productName, bold: true });
    lines.push({ type: 'center', text: productData.category || 'General', fontSize: 'small' });
    lines.push({ type: 'center', text: `₹${parseFloat(productData.selling_price).toFixed(2)}`, bold: true });
    lines.push({ type: 'center', text: `Stock: ${productData.stock_quantity || 0}`, fontSize: 'small' });
    lines.push({ type: 'barcode', barcode: productData.barcode });
    
    return lines;
  }

  /**
   * Minimal template: Just Name + Barcode
   */
  buildMinimalTemplate(productData) {
    const lines = [];
    const maxNameLength = 25;
    const productName = productData.product_name.length > maxNameLength 
      ? productData.product_name.substring(0, maxNameLength - 3) + '...'
      : productData.product_name;
    
    lines.push({ type: 'center', text: productName, bold: true });
    lines.push({ type: 'barcode', barcode: productData.barcode });
    
    return lines;
  }

  /**
   * Price template: Large Price + Name (small) + Barcode
   */
  buildPriceTemplate(productData) {
    const lines = [];
    const maxNameLength = 15;
    const productName = productData.product_name.length > maxNameLength 
      ? productData.product_name.substring(0, maxNameLength - 3) + '...'
      : productData.product_name;
    
    lines.push({ type: 'center', text: `₹${parseFloat(productData.selling_price).toFixed(2)}`, bold: true, fontSize: 'large' });
    lines.push({ type: 'center', text: productName, fontSize: 'small' });
    lines.push({ type: 'barcode', barcode: productData.barcode });
    
    return lines;
  }

  /**
   * Convert label content to ESC/POS commands
   */
  convertLabelToESCPOS(content, settings) {
    let commands = Buffer.alloc(0);
    
    // Initialize printer
    const init = Buffer.from([0x1B, 0x40]);
    commands = Buffer.concat([commands, init]);
    
    // Set smaller font for labels (2x1 inch)
    const smallFont = Buffer.from([0x1D, 0x21, 0x01]); // Double height, normal width
    commands = Buffer.concat([commands, smallFont]);
    
    content.forEach(line => {
      switch (line.type) {
        case 'center':
          commands = Buffer.concat([commands, this.escapeSequence('CENTER')]);
          commands = Buffer.concat([commands, this.formatText(line)]);
          break;
        case 'barcode':
          // Generate actual barcode using ESC/POS commands
          commands = Buffer.concat([commands, this.generateBarcodeCommands(line.barcode)]);
          break;
      }
      
      // Add line break
      commands = Buffer.concat([commands, Buffer.from([0x0A])]);
    });
    
    // No paper cut for labels
    return commands;
  }

  /**
   * Get available label sizes
   */
  getLabelSizes() {
    return [
      { id: '2x1', name: '2 x 1 inch', width: 200, height: 100 },
      { id: '3x1', name: '3 x 1 inch', width: 300, height: 100 },
      { id: '4x6', name: '4 x 6 inch', width: 400, height: 600 }
    ];
  }

  /**
   * Get available label templates
   */
  getLabelTemplates() {
    return [
      {
        id: 'basic',
        name: 'Basic',
        description: 'Product name, price, and barcode',
        fields: ['name', 'price', 'barcode']
      },
      {
        id: 'detailed',
        name: 'Detailed',
        description: 'Name, category, price, stock, and barcode',
        fields: ['name', 'category', 'price', 'stock', 'barcode']
      },
      {
        id: 'minimal',
        name: 'Minimal',
        description: 'Just product name and barcode',
        fields: ['name', 'barcode']
      },
      {
        id: 'price',
        name: 'Price Focus',
        description: 'Large price, small name, and barcode',
        fields: ['price', 'name', 'barcode']
      }
    ];
  }
}

module.exports = ThermalPrinter;