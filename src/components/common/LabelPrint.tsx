import React, { useState, useEffect, useRef } from 'react';
import { useToast } from './ToastContext';
import JsBarcode from 'jsbarcode';

interface LabelPrintProps {
  product: any;
  onClose: () => void;
}

interface LabelSize {
  id: string;
  name: string;
  width: number;
  height: number;
}

interface LabelTemplate {
  id: string;
  name: string;
  description: string;
  fields: string[];
}

const LabelPrint: React.FC<LabelPrintProps> = ({ product, onClose }) => {
  const [labelSizes, setLabelSizes] = useState<LabelSize[]>([
    { id: '2x1', name: '2 x 1 inch', width: 200, height: 100 },
    { id: '3x1', name: '3 x 1 inch', width: 300, height: 100 },
    { id: '4x6', name: '4 x 6 inch', width: 400, height: 600 }
  ]);
  const [templates, setTemplates] = useState<LabelTemplate[]>([
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
  ]);
  const [selectedSize, setSelectedSize] = useState('2x1');
  const [selectedTemplate, setSelectedTemplate] = useState('basic');
  const [quantity, setQuantity] = useState(product.stock_quantity || 1);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [barcodeImage, setBarcodeImage] = useState<string>('');
  const barcodeCanvasRef = useRef<HTMLCanvasElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    loadLabelSizes();
    loadTemplates();
    generatePreview();
  }, []);

  useEffect(() => {
    generatePreview();
  }, [selectedSize, selectedTemplate]);

  const loadLabelSizes = async () => {
    try {
      console.log('Loading label sizes...');
      const result = await (window as any).electron.label.getSizes();
      console.log('Label sizes result:', result);
      if (result.success) {
        setLabelSizes(result.data);
        console.log('Label sizes set:', result.data);
      } else {
        console.error('Failed to load label sizes:', result.error);
      }
    } catch (error) {
      console.error('Error loading label sizes:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      console.log('Loading templates...');
      const result = await (window as any).electron.label.getTemplates();
      console.log('Templates result:', result);
      if (result.success) {
        setTemplates(result.data);
        if (result.data.length > 0) {
          setSelectedTemplate(result.data[0].id);
        }
        console.log('Templates set:', result.data);
      } else {
        console.error('Failed to load templates:', result.error);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const generateBarcodeImage = () => {
    if (barcodeCanvasRef.current) {
      try {
        // Determine barcode type based on value
        let barcodeFormat = 'CODE128';
        if (/^\d{13}$/.test(product.barcode)) {
          barcodeFormat = 'EAN13';
        } else if (/^\d{8}$/.test(product.barcode)) {
          barcodeFormat = 'EAN8';
        }

        // Generate barcode image
        JsBarcode(barcodeCanvasRef.current, product.barcode, {
          format: barcodeFormat,
          width: selectedSize === '2x1' ? 1 : selectedSize === '3x1' ? 2 : 3,
          height: selectedSize === '2x1' ? 30 : selectedSize === '3x1' ? 40 : 50,
          displayValue: true,
          fontSize: selectedSize === '2x1' ? 8 : selectedSize === '3x1' ? 10 : 12,
          margin: 0
        });

        // Convert canvas to data URL
        const dataUrl = barcodeCanvasRef.current.toDataURL('image/png');
        setBarcodeImage(dataUrl);
      } catch (error) {
        console.error('Error generating barcode:', error);
        setBarcodeImage('');
      }
    }
  };

  const generatePreview = () => {
    const maxNameLength = selectedSize === '2x1' ? 20 : selectedSize === '3x1' ? 30 : 50;
    const productName = product.product_name.length > maxNameLength 
      ? product.product_name.substring(0, maxNameLength - 3) + '...'
      : product.product_name;
    
    const priceText = `₹${(product.selling_price || 0).toFixed(2)}`;
    
    setPreviewData({
      productName,
      price: priceText,
      barcode: product.barcode,
      category: product.category,
      stock: product.stock_quantity,
      size: selectedSize,
      template: selectedTemplate
    });

    // Generate barcode image
    generateBarcodeImage();
  };

  const handlePrint = async () => {
    if (quantity < 1 || quantity > 500) {
      showToast('Quantity must be between 1 and 500', 'warning');
      return;
    }

    setLoading(true);
    try {
      const labelSettings = {
        size: selectedSize,
        quantity: quantity,
        template: selectedTemplate
      };

      const result = await (window as any).electron.label.print(product, labelSettings);
      
      if (result.success) {
        showToast(`Label printed successfully! (${quantity} copy/copies)`, 'success');
        onClose();
      } else {
        showToast(`Error printing label: ${result.error}`, 'error');
      }
    } catch (error) {
      showToast(`Error printing label: ${error}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const selectedLabelSize = labelSizes.find(size => size.id === selectedSize);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
        {/* Hidden canvas for barcode generation */}
        <canvas ref={barcodeCanvasRef} style={{ display: 'none' }} />
        
        {/* Header - Fixed */}
        <div className="flex-shrink-0 p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Print Label</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Product Info - Fixed */}
        <div className="flex-shrink-0 p-6 border-b">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="font-semibold">{product.product_name}</div>
            <div className="text-sm text-gray-600">
              {product.barcode} | ₹{product.selling_price}
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Label Settings */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">Label Size</label>
              <select
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {labelSizes.map((size) => (
                  <option key={size.id} value={size.id}>
                    {size.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Label Template</label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} - {template.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Quantity</label>
              <input
                type="number"
                min="1"
                max="500"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="text-xs text-gray-500 mt-1">
                Enter number of labels to print (1-500)
              </div>
            </div>
          </div>

          {/* Label Preview */}
          <div>
            <h3 className="text-sm font-medium mb-2">Label Preview ({templates.find(t => t.id === selectedTemplate)?.name})</h3>
            <div className="border-2 border-dashed border-gray-300 p-4 rounded-lg">
              {previewData && (
                <div 
                  className="bg-white text-black text-center mx-auto"
                  style={{
                    fontSize: selectedSize === '2x1' ? '8px' : selectedSize === '3x1' ? '10px' : '12px',
                    fontWeight: 'bold',
                    lineHeight: '1.2',
                    maxWidth: '200px'
                  }}
                >
                  {selectedTemplate === 'detailed' && (
                    <>
                      <div className="mb-1">{previewData.productName}</div>
                      <div className="text-xs mb-1">{previewData.category}</div>
                      <div className="mb-1">{previewData.price}</div>
                      <div className="text-xs mb-1">Stock: {previewData.stock}</div>
                      {barcodeImage && (
                        <img 
                          src={barcodeImage} 
                          alt="Barcode" 
                          className="w-full h-8 object-contain mb-1"
                        />
                      )}
                      <div className="text-xs">{previewData.barcode}</div>
                    </>
                  )}
                  {selectedTemplate === 'minimal' && (
                    <>
                      <div className="mb-1">{previewData.productName}</div>
                      {barcodeImage && (
                        <img 
                          src={barcodeImage} 
                          alt="Barcode" 
                          className="w-full h-8 object-contain mb-1"
                        />
                      )}
                      <div className="text-xs">{previewData.barcode}</div>
                    </>
                  )}
                  {selectedTemplate === 'price' && (
                    <>
                      <div className="mb-1 text-lg">{previewData.price}</div>
                      <div className="text-xs mb-1">{previewData.productName}</div>
                      {barcodeImage && (
                        <img 
                          src={barcodeImage} 
                          alt="Barcode" 
                          className="w-full h-8 object-contain mb-1"
                        />
                      )}
                      <div className="text-xs">{previewData.barcode}</div>
                    </>
                  )}
                  {selectedTemplate === 'basic' && (
                    <>
                      <div className="mb-1">{previewData.productName}</div>
                      <div className="mb-1">{previewData.price}</div>
                      {barcodeImage && (
                        <img 
                          src={barcodeImage} 
                          alt="Barcode" 
                          className="w-full h-8 object-contain mb-1"
                        />
                      )}
                      <div className="text-xs">{previewData.barcode}</div>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Preview for {selectedLabelSize?.name || selectedSize} • {templates.find(t => t.id === selectedTemplate)?.description}
            </div>
          </div>
        </div>

        {/* Footer with Buttons - Fixed */}
        <div className="flex-shrink-0 p-6 border-t bg-gray-50">
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {loading ? 'Printing...' : `Print ${quantity} Label${quantity > 1 ? 's' : ''}`}
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabelPrint;