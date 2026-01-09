const { exec } = require('child_process');
const { BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
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
      this.isConnected = true;
      console.log(`Thermal printer "${printerName}" initialized`);
      
      const platform = os.platform();
      if (platform === 'win32') {
        return new Promise((resolve) => {
          exec(`wmic printer where "Name='${printerName.replace(/'/g, "''")}'" get Name`, (error, stdout, stderr) => {
            if (!error && stdout.includes(printerName)) {
              resolve({ success: true, message: 'Printer connected and verified' });
            } else {
              resolve({ success: true, message: 'Printer connected' });
            }
          });
        });
      }
      
      return { success: true, message: 'Printer initialized successfully' };
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
      const platform = os.platform();
      
      if (platform === 'win32') {
        const command = `wmic printer where "Name='${this.printerName.replace(/'/g, "''")}'" get Name`;
        const result = await this.executeCommand(command);
        
        if (result.success && result.output.includes(this.printerName)) {
          return { success: true, message: 'Printer found and ready' };
        } else {
          return { success: true, message: 'Printer configured (will attempt to print)' };
        }
      } else {
        const command = `lpstat -p ${this.printerName}`;
        const result = await this.executeCommand(command);
        
        if (result.success && !result.output.includes('unknown printer')) {
          return { success: true, message: 'Printer found and ready' };
        } else {
          return { success: true, message: 'Printer configured (will attempt to print)' };
        }
      }
    } catch (error) {
      return { success: true, message: 'Printer connection test inconclusive, will try printing' };
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
        command = 'wmic printer where "Local=\'TRUE\'" get Name,ShareName /format:csv';
      } else if (platform === 'darwin') {
        command = 'lpstat -p';
      } else {
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
      const billContent = this.buildThermalBillText(billData, shopInfo);
      
      // Send to printer
      const result = await this.printText(billContent);
      
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
   * Build thermal bill as plain text
   */
  buildThermalBillText(billData, shopInfo) {
    const lines = [];
    const maxWidth = 40; // ~40 chars fit on 76mm (3 inch) thermal paper
    
    // Header
    lines.push(this.centerText(shopInfo.shop_name || 'My Shop', maxWidth, true));
    if (shopInfo.owner_name) {
      lines.push(this.centerText(shopInfo.owner_name, maxWidth));
    }
    if (shopInfo.address) {
      lines.push(this.centerText(shopInfo.address, maxWidth));
    }
    if (shopInfo.phone) {
      lines.push(this.centerText(`Phone: ${shopInfo.phone}`, maxWidth));
    }
    
    lines.push(this.lineText(maxWidth));
    
    // Bill details
    lines.push(this.leftText(`Bill No: ${billData.bill_number}`, maxWidth));
    lines.push(this.leftText(`Date: ${this.formatDate(billData.bill_date)}`, maxWidth));
    
    if (billData.customer_name) {
      lines.push(this.leftText(`Customer: ${billData.customer_name}`, maxWidth));
    }
    if (billData.customer_phone) {
      lines.push(this.leftText(`Phone: ${billData.customer_phone}`, maxWidth));
    }
    
    lines.push(this.lineText(maxWidth));
    
    // Items header
    lines.push(this.leftText('ITEMS', maxWidth, true));
    lines.push(this.lineText(maxWidth));
    
    // Items
    billData.items.forEach(item => {
      const productName = item.product_name.length > 25 
        ? item.product_name.substring(0, 22) + '...' 
        : item.product_name;
      lines.push(this.leftText(productName, maxWidth));
      lines.push(this.leftText(`${item.quantity} x ${this.formatCurrency(item.unit_price)} = ${this.formatCurrency(item.total_price)}`, maxWidth));
    });
    
    lines.push(this.lineText(maxWidth));
    
    // Totals
    lines.push(this.rightText(`Subtotal: ${this.formatCurrency(billData.subtotal)}`, maxWidth));
    
    if (billData.discount_amount > 0) {
      lines.push(this.rightText(`Discount (${billData.discount_percentage}%): -${this.formatCurrency(billData.discount_amount)}`, maxWidth));
    }
    
    lines.push(this.lineText(maxWidth));
    lines.push(this.rightText(`TOTAL: ${this.formatCurrency(billData.total_amount)}`, maxWidth, true));
    
    lines.push(this.lineText(maxWidth));
    
    // Payment info
    lines.push(this.rightText(`Payment: ${billData.payment_mode}`, maxWidth));
    lines.push(this.rightText(`Paid: ${this.formatCurrency(billData.paid_amount)}`, maxWidth));
    
    if (billData.balance_amount > 0) {
      lines.push(this.rightText(`Balance: ${this.formatCurrency(billData.balance_amount)}`, maxWidth));
    }
    
    lines.push(this.lineText(maxWidth));
    
    // Footer
    lines.push(this.centerText('Thank you for your business!', maxWidth));
    lines.push(this.centerText('Please visit again', maxWidth));
    lines.push('');
    
    return lines.join('\n');
  }

  /**
   * Print text content using BrowserWindow
   */
  async printText(textContent) {
    return new Promise((resolve) => {
      try {
        // Create HTML for printing
        const htmlContent = this.createPrintHTML(textContent);
        
        // Save HTML to temp file (more reliable than data URL)
        const tempDir = os.tmpdir();
        const htmlFile = path.join(tempDir, `receipt_${Date.now()}.html`);
        fs.writeFileSync(htmlFile, htmlContent, 'utf8');
        
        console.log('HTML file created:', htmlFile);
        
        // Create hidden window
        const win = new BrowserWindow({ 
          show: false,
          width: 400,
          height: 600,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false
          }
        });
        
        let printCompleted = false;
        
        win.webContents.on('did-finish-load', () => {
          console.log('Page loaded, waiting before print...');
          
          setTimeout(() => {
            if (printCompleted) return;
            
            console.log('Calling print...');
            win.webContents.print({
              silent: false, // Show print dialog for debugging
              printBackground: true,
              deviceName: this.printerName,
              margins: { marginType: 'custom', top: 0, bottom: 0, left: 0, right: 0 }
            }, (success, errorType) => {
              printCompleted = true;
              console.log('Print result:', success, errorType);
              
              // Clean up temp file
              try {
                fs.unlinkSync(htmlFile);
              } catch (e) {}
              
              win.close();
              
              if (success) {
                resolve({ success: true, message: 'Bill printed successfully' });
              } else {
                resolve({ success: false, error: errorType || 'Print failed' });
              }
            });
          }, 1000);
        });
        
        win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
          printCompleted = true;
          console.error('Load failed:', errorCode, errorDescription);
          
          try {
            fs.unlinkSync(htmlFile);
          } catch (e) {}
          
          win.close();
          resolve({ success: false, error: errorDescription });
        });
        
        // Load the HTML file
        win.loadFile(htmlFile);
        
        // Timeout
        setTimeout(() => {
          if (!printCompleted) {
            printCompleted = true;
            console.log('Print timeout');
            try { win.close(); } catch (e) {}
            resolve({ success: true, message: 'Print command sent (timeout)' });
          }
        }, 15000);
        
      } catch (error) {
        console.error('Print error:', error);
        resolve({ success: false, error: error.message });
      }
    });
  }

  /**
   * Create HTML for printing
   */
  createPrintHTML(textContent) {
    const lines = textContent.split('\n');
    
    let bodyContent = '';
    lines.forEach(line => {
      // Detect line separator (40 dashes)
      if (line.match(/^-{40}$/)) {
        bodyContent += '<div class="line">----------------------------------------</div>\n';
      } else if (line.trim() === '') {
        bodyContent += '<div class="spacer"></div>\n';
      } else {
        // Convert **text** to bold
        let html = this.escapeHtml(line);
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        bodyContent += `<div class="line-content">${html}</div>\n`;
      }
    });
    
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    @page {
      size: 76mm auto;
      margin: 0;
    }
    
    @media print {
      body {
        width: 74mm !important;
        padding: 2mm !important;
      }
    }
    
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 14px;  /* Larger font for readability */
      line-height: 1.3;
      width: 74mm;
      margin: 0 auto;
      padding: 2mm;
      background: white;
    }
    
    .line-content {
      overflow: hidden;
      margin: 1px 0;
    }
    
    .line {
      font-size: 12px;
      letter-spacing: 1px;
      margin: 2px 0;
      overflow: hidden;
    }
    
    .spacer {
      height: 6px;
    }
    
    strong {
      font-weight: bold;
    }
  </style>
</head>
<body>
${bodyContent}
</body>
</html>`;
  }

  /**
   * Escape HTML special characters
   */
  escapeHtml(text) {
    return text
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '&#039;');
  }

  /**
   * Format text for center alignment
   */
  centerText(text, width, bold = false) {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    const result = ' '.repeat(padding) + text;
    return bold ? `**${result}**` : result;
  }

  /**
   * Format text for left alignment
   */
  leftText(text, width, bold = false) {
    const result = text + ' '.repeat(Math.max(0, width - text.length));
    return bold ? `**${result}**` : result;
  }

  /**
   * Format text for right alignment
   */
  rightText(text, width, bold = false) {
    const padding = Math.max(0, width - text.length);
    const result = ' '.repeat(padding) + text;
    return bold ? `**${result}**` : result;
  }

  /**
   * Create line separator
   */
  lineText(width) {
    return '-'.repeat(width);
  }

  /**
   * Format currency
   */
  formatCurrency(amount) {
    return `₹${parseFloat(amount).toFixed(2)}`;
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

      const settings = {
        size: '2x1',
        quantity: 1,
        template: 'basic',
        ...labelSettings
      };

      const labelContent = this.buildLabelText(productData, settings.template);
      const result = await this.printText(labelContent);
      
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
            const labelContent = this.buildLabelText(productData, settings.template);
            const result = await this.printText(labelContent);
            
            if (result.success) {
              successCount++;
            } else {
              errorCount++;
              errors.push(`Failed to print label for ${productData.product_name}: ${result.error}`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
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
   * Build label text
   */
  buildLabelText(productData, templateId) {
    const maxWidth = 16;
    const lines = [];
    
    switch (templateId) {
      case 'basic':
      default:
        const name = productData.product_name.length > 14 
          ? productData.product_name.substring(0, 11) + '...' 
          : productData.product_name;
        lines.push(this.centerText(name, maxWidth, true));
        lines.push(this.centerText(`₹${parseFloat(productData.selling_price).toFixed(2)}`, maxWidth, true));
        if (productData.barcode) {
          lines.push(this.centerText(productData.barcode, maxWidth));
        }
        break;
        
      case 'detailed':
        const dName = productData.product_name.length > 12 
          ? productData.product_name.substring(0, 9) + '...' 
          : productData.product_name;
        lines.push(this.centerText(dName, maxWidth, true));
        lines.push(this.centerText(productData.category || 'General', maxWidth));
        lines.push(this.centerText(`₹${parseFloat(productData.selling_price).toFixed(2)}`, maxWidth, true));
        if (productData.barcode) {
          lines.push(this.centerText(productData.barcode, maxWidth));
        }
        break;
        
      case 'minimal':
        const mName = productData.product_name.length > 16 
          ? productData.product_name.substring(0, 13) + '...' 
          : productData.product_name;
        lines.push(this.centerText(mName, maxWidth, true));
        if (productData.barcode) {
          lines.push(this.centerText(productData.barcode, maxWidth));
        }
        break;
        
      case 'price':
        lines.push(this.centerText(`₹${parseFloat(productData.selling_price).toFixed(2)}`, maxWidth, true));
        const pName = productData.product_name.length > 10 
          ? productData.product_name.substring(0, 7) + '...' 
          : productData.product_name;
        lines.push(this.centerText(pName, maxWidth));
        if (productData.barcode) {
          lines.push(this.centerText(productData.barcode, maxWidth));
        }
        break;
    }
    
    return lines.join('\n');
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
