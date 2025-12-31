import React, { useState, useEffect, useRef } from 'react';
import { ExchangeItem } from '../../types/returnTypes';

interface ExchangeSelectorProps {
  exchangeItems: ExchangeItem[];
  onItemsChange: (items: ExchangeItem[]) => void;
  onClose: () => void;
}

const ExchangeSelector: React.FC<ExchangeSelectorProps> = ({
  exchangeItems,
  onItemsChange,
  onClose
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [lastScan, setLastScan] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Barcode scanner listener
  useEffect(() => {
    const handleBarcodeScan = async (_event: any, data: { barcode: string }) => {
      console.log('Barcode scanned:', data.barcode);
      setLastScan(data.barcode);
      
      // Find product by barcode
      const result = await (window as any).electron.products.findByBarcode(data.barcode);
      if (result.success && result.data) {
        addToExchangeItems(result.data);
        setTimeout(() => setLastScan(''), 2000);
      }
    };

    (window as any).electron.barcode.onScan(handleBarcodeScan);

    return () => {
      (window as any).electron.barcode.removeScanListener(handleBarcodeScan);
    };
  }, [exchangeItems]);

  // Search products
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length >= 2) {
      const result = await (window as any).electron.products.search(query);
      if (result.success) {
        setSearchResults(result.data);
        setShowSearchResults(true);
      }
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  // Add product to exchange items
  const addToExchangeItems = (product: any) => {
    const existingIndex = exchangeItems.findIndex(item => item.product_id === product.product_id);
    
    if (existingIndex >= 0) {
      // Increase quantity
      const updatedItems = [...exchangeItems];
      updatedItems[existingIndex].quantity += 1;
      updatedItems[existingIndex].total_price = updatedItems[existingIndex].quantity * updatedItems[existingIndex].unit_price;
      onItemsChange(updatedItems);
    } else {
      // Add new item
      const newItem: ExchangeItem = {
        exchange_item_id: 0,
        return_id: 0,
        product_id: product.product_id,
        product_name: product.product_name,
        product_code: product.product_code,
        barcode: product.barcode,
        quantity: 1,
        unit_price: product.selling_price,
        total_price: product.selling_price
      };
      onItemsChange([...exchangeItems, newItem]);
    }

    // Clear search
    setSearchResults([]);
    setSearchQuery('');
    setShowSearchResults(false);
    searchInputRef.current?.focus();
  };

  // Update quantity
  const updateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromExchangeItems(index);
      return;
    }

    const updatedItems = [...exchangeItems];
    updatedItems[index].quantity = newQuantity;
    updatedItems[index].total_price = newQuantity * updatedItems[index].unit_price;
    onItemsChange(updatedItems);
  };

  // Remove from exchange items
  const removeFromExchangeItems = (index: number) => {
    const updatedItems = exchangeItems.filter((_, i) => i !== index);
    onItemsChange(updatedItems);
  };

  // Calculate totals
  const subtotal = exchangeItems.reduce((sum, item) => sum + item.total_price, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold">Select Exchange Items</h2>
          <div className="flex items-center gap-4">
            {lastScan && (
              <div className="bg-green-500 px-4 py-2 rounded animate-pulse">
                ✓ Scanned: {lastScan}
              </div>
            )}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Side - Product Search */}
          <div className="flex-1 p-6 flex flex-col">
            {/* Search Box */}
            <div className="mb-4 relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => searchQuery.length >= 2 && searchResults.length > 0 && setShowSearchResults(true)}
                placeholder="Search product by name, barcode, or scan barcode..."
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                autoFocus
              />
              
              {/* Search Results Dropdown */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map((product) => (
                    <div
                      key={product.product_id}
                      onClick={() => addToExchangeItems(product)}
                      className="p-3 hover:bg-blue-50 cursor-pointer border-b"
                    >
                      <div className="font-semibold">{product.product_name}</div>
                      <div className="text-sm text-gray-600">
                        {product.barcode} | ₹{product.selling_price} | Stock: {product.stock_quantity}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Exchange Items List */}
            <div className="flex-1 bg-gray-50 rounded-lg overflow-hidden">
              {exchangeItems.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🔄</div>
                    <div className="text-xl">No items selected</div>
                    <div className="text-sm mt-2">Search or scan products to add</div>
                  </div>
                </div>
              ) : (
                <div className="h-full overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Product</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold">Qty</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold">Price</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold">Total</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {exchangeItems.map((item, index) => (
                        <tr key={index} className="border-t bg-white">
                          <td className="px-4 py-3">
                            <div className="font-medium">{item.product_name}</div>
                            <div className="text-xs text-gray-500">{item.barcode}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => updateQuantity(index, item.quantity - 1)}
                                className="w-8 h-8 bg-gray-200 rounded hover:bg-gray-300"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 1)}
                                className="w-16 text-center border rounded px-2 py-1"
                                min="1"
                              />
                              <button
                                onClick={() => updateQuantity(index, item.quantity + 1)}
                                className="w-8 h-8 bg-gray-200 rounded hover:bg-gray-300"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">₹{item.unit_price.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-semibold">₹{item.total_price.toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => removeFromExchangeItems(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right Side - Summary */}
          <div className="w-80 bg-white p-6 shadow-lg flex flex-col">
            <h3 className="font-semibold mb-4">Exchange Summary</h3>
            
            <div className="flex-1">
              <div className="space-y-3 text-lg">
                <div className="flex justify-between">
                  <span>Items:</span>
                  <span className="font-semibold">{exchangeItems.length}</span>
                </div>

                <div className="flex justify-between">
                  <span>Total Quantity:</span>
                  <span className="font-semibold">
                    {exchangeItems.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                </div>

                <div className="border-t pt-3 flex justify-between text-2xl font-bold text-blue-600">
                  <span>TOTAL:</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 mt-6">
              <button
                onClick={() => {
                  if (exchangeItems.length === 0) {
                    alert('Please add at least one item to exchange');
                    return;
                  }
                  onClose();
                }}
                disabled={exchangeItems.length === 0}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold text-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                ✓ Confirm Exchange Items
              </button>
              <button
                onClick={() => {
                  if (confirm('Clear all exchange items?')) {
                    onItemsChange([]);
                  }
                }}
                className="w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Clear All
              </button>
            </div>

            {/* Quick Actions */}
            <div className="mt-4 pt-4 border-t">
              <h4 className="font-semibold mb-2">Quick Actions</h4>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => searchInputRef.current?.focus()}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                >
                  🔍 Search
                </button>
                <button
                  onClick={() => {
                    // Focus on search and clear it
                    searchInputRef.current?.focus();
                    setSearchQuery('');
                    setSearchResults([]);
                    setShowSearchResults(false);
                  }}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                >
                  🧹 Clear
                </button>
              </div>
            </div>

            {/* Tips */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-1">💡 Tips</h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Scan barcodes for quick item entry</li>
                <li>• Use search for product names</li>
                <li>• Adjust quantities as needed</li>
                <li>• Check stock availability</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExchangeSelector;