import JsBarcode from 'jsbarcode';

export interface BarcodeOptions {
  format?: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  margin?: number;
}

export const generateBarcodeDataURL = (
  value: string, 
  options: BarcodeOptions = {}
): string => {
  const defaultOptions = {
    format: 'CODE128',
    width: 2,
    height: 50,
    displayValue: false,
    fontSize: 12,
    margin: 0,
    ...options
  };

  try {
    // Create a temporary canvas element
    const canvas = document.createElement('canvas');
    
    // Generate barcode
    JsBarcode(canvas, value, defaultOptions);
    
    // Convert canvas to data URL
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error generating barcode:', error);
    return '';
  }
};

export const generateBarcodeSVG = (
  value: string, 
  options: BarcodeOptions = {}
): string => {
  const defaultOptions = {
    format: 'CODE128',
    width: 2,
    height: 50,
    displayValue: false,
    fontSize: 12,
    margin: 0,
    ...options
  };

  try {
    // Create a temporary SVG element
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    
    // Generate barcode
    JsBarcode(svg, value, defaultOptions);
    
    // Convert SVG element to string
    const serializer = new XMLSerializer();
    return serializer.serializeToString(svg);
  } catch (error) {
    console.error('Error generating barcode SVG:', error);
    return '';
  }
};

export const validateBarcode = (barcode: string): boolean => {
  // Basic validation for different barcode formats
  if (!barcode || barcode.length === 0) return false;
  
  // CODE128 and CODE39: any alphanumeric string
  if (/^[A-Za-z0-9\-\.\s\$\/\+\%]+$/.test(barcode) && barcode.length <= 80) {
    return true;
  }
  
  // EAN13: must be 13 digits
  if (/^\d{13}$/.test(barcode)) {
    return true;
  }
  
  // EAN8: must be 8 digits
  if (/^\d{8}$/.test(barcode)) {
    return true;
  }
  
  return false;
};

export const getBarcodeType = (barcode: string): string => {
  if (/^\d{13}$/.test(barcode)) {
    return 'EAN13';
  } else if (/^\d{8}$/.test(barcode)) {
    return 'EAN8';
  } else {
    return 'CODE128';
  }
};