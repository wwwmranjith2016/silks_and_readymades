class BarcodeScannerManager {
  constructor() {
    this.scanBuffer = '';
    this.scanTimeout = null;
    this.mainWindow = null;
  }

  /**
   * Initialize scanner listener
   */
  initialize(mainWindow) {
    this.mainWindow = mainWindow;
    
    // Listen for rapid keyboard input (scanner behavior)
    mainWindow.webContents.on('before-input-event', (event, input) => {
      // Ignore if input is in a text field (check via JS)
      const isInInputField = mainWindow.webContents.executeJavaScript(`
        document.activeElement.tagName === 'INPUT' || 
        document.activeElement.tagName === 'TEXTAREA'
      `);
      
      if (input.type === 'keyDown') {
        if (input.key === 'Enter' && this.scanBuffer.length > 0) {
          // Process scan
          this.processScan(this.scanBuffer);
          this.scanBuffer = '';
        } else if (input.key.length === 1 && !input.control && !input.alt) {
          // Accumulate characters
          this.scanBuffer += input.key;
          
          // Reset timeout
          clearTimeout(this.scanTimeout);
          this.scanTimeout = setTimeout(() => {
            this.scanBuffer = ''; // Clear if input is too slow
          }, 100);
        }
      }
    });
  }

  /**
   * Process scanned barcode
   */
  processScan(barcode) {
    console.log('Barcode scanned:', barcode);
    
    // Send to renderer process
    this.mainWindow.webContents.send('barcode-scanned', {
      barcode: barcode,
      timestamp: new Date().toISOString()
    });
    
    // Play beep sound
    this.playBeep();
  }

  /**
   * Play beep sound
   */
  playBeep() {
    this.mainWindow.webContents.executeJavaScript(`
      const beep = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=');
      beep.play().catch(e => console.log('Beep error:', e));
    `);
  }
}

module.exports = BarcodeScannerManager;