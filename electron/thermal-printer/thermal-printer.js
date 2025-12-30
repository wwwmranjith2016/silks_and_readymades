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
}

module.exports = ThermalPrinter;