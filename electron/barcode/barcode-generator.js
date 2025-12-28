class BarcodeGenerator {
  /**
   * Generate unique barcode
   */
  generateUniqueBarcode(dbManager, category = 'GEN') {
    try {
      // Get current sequence
      const sequence = dbManager.get(
        'SELECT current_number, prefix FROM barcode_sequence WHERE id = 1'
      );
      
      if (!sequence) {
        // Initialize if not exists
        dbManager.run(
          'INSERT INTO barcode_sequence (prefix, current_number) VALUES (?, ?)',
          ['SB', 1000]
        );
        return this.generateUniqueBarcode(dbManager, category);
      }
      
      const nextNumber = sequence.current_number + 1;
      
      // Format: SB-CAT-NNNN
      const categoryCode = this.getCategoryCode(category);
      const barcode = `${sequence.prefix}${categoryCode}${nextNumber.toString().padStart(4, '0')}`;
      
      // Update sequence
      dbManager.run(
        'UPDATE barcode_sequence SET current_number = ?, last_generated = CURRENT_TIMESTAMP WHERE id = 1',
        [nextNumber]
      );
      
      // Save database
      const { app } = require('electron');
      const path = require('path');
      const dbPath = path.join(app.getPath('userData'), 'billing.db');
      dbManager.saveDatabase(dbPath);
      
      return { success: true, barcode };
    } catch (error) {
      console.error('Barcode generation error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate barcode image (will be done in renderer process using jsbarcode)
   */
  generateBarcodeImage(barcodeValue, type = 'CODE128') {
    // We'll generate this in the browser using jsbarcode
    // Return placeholder for now
    return { 
      success: true, 
      barcode: barcodeValue,
      type: type,
      message: 'Generate in renderer'
    };
  }

  getCategoryCode(category) {
    const codes = {
      'SILK': 'SLK',
      'READYMADE': 'RDY',
      'SAREE': 'SAR',
      'SHIRT': 'SHT',
      'PANT': 'PNT',
      'DRESS': 'DRS',
      'GENERAL': 'GEN'
    };
    return codes[category.toUpperCase()] || 'GEN';
  }

  validateBarcode(barcode, type) {
    switch(type) {
      case 'EAN13':
        return /^\d{13}$/.test(barcode);
      case 'EAN8':
        return /^\d{8}$/.test(barcode);
      case 'CODE128':
      case 'CODE39':
        return barcode.length > 0 && barcode.length <= 80;
      default:
        return false;
    }
  }
}

module.exports = BarcodeGenerator;