import React, { useState, useEffect } from 'react';
import JsBarcode from 'jsbarcode';
import { useToast } from '../common/ToastContext';

interface ProductFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  editProduct?: any;
}

const ProductForm: React.FC<ProductFormProps> = ({ onSuccess, onCancel, editProduct }) => {
  const [formData, setFormData] = useState({
    product_name: '',
    category: 'GENERAL',
    sub_category: '',
    size: '',
    color: '',
    barcode: '',
    barcode_type: 'CODE128',
    product_code: '',
    purchase_price: '',
    selling_price: '',
    stock_quantity: '',
    min_stock_level: '5',
  });

  const [barcodeImage, setBarcodeImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTamilMode, setIsTamilMode] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    // Load Tamil mode preference from localStorage
    const savedTamilMode = localStorage.getItem('productFormTamilMode');
    setIsTamilMode(savedTamilMode === 'true');
  }, []);

  useEffect(() => {
    if (editProduct) {
      setFormData({
        product_name: editProduct.product_name || '',
        category: editProduct.category || 'GENERAL',
        sub_category: editProduct.sub_category || '',
        size: editProduct.size || '',
        color: editProduct.color || '',
        barcode: editProduct.barcode || '',
        barcode_type: editProduct.barcode_type || 'CODE128',
        product_code: editProduct.product_code || '',
        purchase_price: editProduct.purchase_price?.toString() || '',
        selling_price: editProduct.selling_price?.toString() || '',
        stock_quantity: editProduct.stock_quantity?.toString() || '',
        min_stock_level: editProduct.min_stock_level?.toString() || '5',
      });
      
      if (editProduct.barcode) {
        generateBarcodeImage(editProduct.barcode, editProduct.barcode_type);
      }
    }
  }, [editProduct]);

  const handleGenerateBarcode = async () => {
    try {
      const result = await (window as any).electron.barcode.generateUnique(formData.category);
      if (result.success) {
        setFormData({ ...formData, barcode: result.barcode });
        generateBarcodeImage(result.barcode, formData.barcode_type);
      }
    } catch (error) {
      showToast('Error generating barcode: ' + error, 'error');
    }
  };

  const generateBarcodeImage = (barcode: string, type: string) => {
    try {
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, barcode, {
        format: type,
        width: 2,
        height: 80,
        displayValue: true,
        fontSize: 16,
      });
      setBarcodeImage(canvas.toDataURL('image/png'));
    } catch (error) {
      console.error('Barcode generation error:', error);
    }
  };

  const handleBarcodeChange = (value: string) => {
    setFormData({ ...formData, barcode: value });
    if (value.length >= 4) {
      generateBarcodeImage(value, formData.barcode_type);
    }
  };

  const toggleTamilMode = () => {
    const newTamilMode = !isTamilMode;
    setIsTamilMode(newTamilMode);
    localStorage.setItem('productFormTamilMode', newTamilMode.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.product_name || !formData.barcode || !formData.selling_price) {
      showToast('Please fill in all required fields', 'warning');
      return;
    }

    setLoading(true);

    try {
      const productData = {
        ...formData,
        purchase_price: parseFloat(formData.purchase_price) || 0,
        selling_price: parseFloat(formData.selling_price),
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        min_stock_level: parseInt(formData.min_stock_level) || 5,
      };

      let result;
      if (editProduct) {
        result = await (window as any).electron.products.update(editProduct.product_id, productData);
      } else {
        result = await (window as any).electron.products.create(productData);
      }

      if (result.success) {
        showToast(result.message, 'success');
        onSuccess();
      } else {
        showToast('Error: ' + result.error, 'error');
      }
    } catch (error) {
      showToast('Error saving product: ' + error, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">
              {editProduct ? 'Edit Product' : 'Add New Product'}
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Product Name */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={toggleTamilMode}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    isTamilMode 
                      ? 'bg-orange-500 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {isTamilMode ? 'தமிழ்' : 'English'}
                </button>
              </div>
              <input
                type="text"
                value={formData.product_name}
                onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  isTamilMode 
                    ? 'border-orange-300 focus:ring-orange-500 bg-orange-50' 
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder={isTamilMode ? 'தமிழில் பொருள் பெயர் உள்ளிடவும்...' : 'Enter product name...'}
                style={{ fontFamily: isTamilMode ? 'Noto Sans Tamil, Arial, sans-serif' : 'inherit' }}
                required
              />
            </div>

            {/* Category */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="GENERAL">General</option>
                  <option value="SILK">Silk</option>
                  <option value="READYMADE">Readymade</option>
                  <option value="SAREE">Saree</option>
                  <option value="SHIRT">Shirt</option>
                  <option value="PANT">Pant</option>
                  <option value="DRESS">Dress</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Sub Category</label>
                <input
                  type="text"
                  value={formData.sub_category}
                  onChange={(e) => setFormData({ ...formData, sub_category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Size and Color */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Size</label>
                <input
                  type="text"
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  placeholder="S, M, L, XL, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Color</label>
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Barcode */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Barcode <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => handleBarcodeChange(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <button
                  type="button"
                  onClick={handleGenerateBarcode}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  🔄 Generate
                </button>
              </div>
              {barcodeImage && (
                <div className="mt-2 p-2 bg-gray-50 rounded border">
                  <img src={barcodeImage} alt="Barcode" className="mx-auto" />
                </div>
              )}
            </div>

            {/* Prices */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Purchase Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.purchase_price}
                  onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Selling Price <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.selling_price}
                  onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Stock */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Stock Quantity</label>
                <input
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Min Stock Level</label>
                <input
                  type="number"
                  value={formData.min_stock_level}
                  onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-400"
              >
                {loading ? 'Saving...' : (editProduct ? 'Update Product' : 'Save Product')}
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProductForm;