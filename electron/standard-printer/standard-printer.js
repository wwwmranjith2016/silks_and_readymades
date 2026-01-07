const { BrowserWindow } = require('electron');

class StandardPrinter {
  constructor() {
    this.printerName = '';
  }

  async initialize(printerName) {
    this.printerName = printerName || 'Canon G3010 series';
    return { success: true, message: 'Printer set successfully' };
  }

  async getAvailablePrinters() {
    try {
      const win = BrowserWindow.getAllWindows()[0];
      const printers = await win.webContents.getPrinters();
      
      return {
        success: true,
        printers: printers.map(p => ({
          name: p.name,
          displayName: p.displayName,
          description: p.description,
          status: p.status,
          isDefault: p.isDefault
        }))
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async printBill(billData, shopInfo) {
    return new Promise((resolve) => {
      try {
        const htmlContent = this.generateBillHTML(billData, shopInfo);
        
        const win = new BrowserWindow({ 
          show: false,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
          }
        });
        
        // Wait for page to load before printing
        win.webContents.on('did-finish-load', () => {
          // Add a small delay to ensure content is fully rendered
          setTimeout(() => {
            win.webContents.print({
              silent: false, // Set to false first to see print dialog for testing
              printBackground: true,
              deviceName: this.printerName,
              margins: { marginType: 'none' }
            }, (success, errorType) => {
              if (success) {
                console.log('Print job completed successfully');
              } else {
                console.error('Print job failed:', errorType);
              }
              
              // Close window after print job completes
              win.close();
              
              if (success) {
                resolve({ success: true, message: 'Bill printed successfully' });
              } else {
                resolve({ success: false, error: errorType || 'Print job failed' });
              }
            });
          }, 500);
        });
        
        win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
        
      } catch (error) {
        console.error('Print error:', error);
        resolve({ success: false, error: error.message });
      }
    });
  }

  generateBillHTML(billData, shopInfo) {
    // Handle shopInfo with defaults
    const shop = shopInfo || {};
    const shopName = shop.shop_name || 'My Shop';
    const address = shop.address || '';
    const phone = shop.phone || '';
    const logo = shop.logo || '';
    const footerMessage = shop.footer_message || 'Thank you for your business!';
    const includeLogo = shop.include_logo !== false;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          @page { size: 80mm auto; margin: 5mm; }
          body { 
            font-family: Arial, sans-serif; 
            font-size: 12px;
            width: 70mm;
            margin: 0 auto;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-bottom: 1px dashed #000; margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; }
          td { padding: 2px 0; }
          .logo { max-width: 50mm; max-height: 20mm; margin-bottom: 5px; }
        </style>
      </head>
      <body>
        ${includeLogo && logo ? `<div class="center"><img src="${logo}" class="logo" alt="Logo" /></div>` : ''}
        <div class="center bold">${shopName}</div>
        ${address ? `<div class="center">${address}</div>` : ''}
        ${phone ? `<div class="center">Phone: ${phone}</div>` : ''}
        <div class="line"></div>
        
        <div>Bill No: ${billData.bill_number}</div>
        <div>Date: ${new Date(billData.bill_date).toLocaleString()}</div>
        ${billData.customer_name ? `<div>Customer: ${billData.customer_name}</div>` : ''}
        ${billData.customer_phone ? `<div>Phone: ${billData.customer_phone}</div>` : ''}
        
        <div class="line"></div>
        
        <table>
          ${billData.items.map(item => `
            <tr>
              <td colspan="2">${item.product_name}</td>
            </tr>
            <tr>
              <td>${item.quantity} x ₹${item.unit_price}</td>
              <td style="text-align: right;">₹${item.total_price}</td>
            </tr>
          `).join('')}
        </table>
        
        <div class="line"></div>
        
        <table>
          <tr><td>Subtotal:</td><td style="text-align: right;">₹${billData.subtotal}</td></tr>
          ${billData.discount_amount > 0 ? `
            <tr><td>Discount:</td><td style="text-align: right;">-₹${billData.discount_amount}</td></tr>
          ` : ''}
          <tr class="bold"><td>TOTAL:</td><td style="text-align: right;">₹${billData.total_amount}</td></tr>
        </table>
        
        <div class="line"></div>
        
        <div>Payment: ${billData.payment_mode || 'CASH'}</div>
        <div>Paid: ₹${billData.paid_amount || billData.total_amount}</div>
        ${billData.balance_amount > 0 ? `<div>Balance: ₹${billData.balance_amount}</div>` : ''}
        
        <div class="line"></div>
        <div class="center">${footerMessage}</div>
        ${shop.show_terms && shop.terms_text ? `<div class="center" style="font-size: 10px; margin-top: 5px;">${shop.terms_text}</div>` : ''}
      </body>
      </html>
    `;
  }

  async testConnection() {
    return { success: true, message: 'Printer available' };
  }

  getStatus() {
    return { connected: true, printerName: this.printerName, ready: true };
  }
}

module.exports = StandardPrinter;