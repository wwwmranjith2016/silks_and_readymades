import React, { useState, useEffect, useRef } from 'react';
import SampleReceipt from './SampleReceipt';
import { useToast } from '../common/ToastContext';
import { getShopInfo } from '../../utils/shopSettings';

interface CartItem {
  product_id: number;
  product_name: string;
  barcode: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

const BillingScreen: React.FC = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [processing, setProcessing] = useState(false);
  const [lastScan, setLastScan] = useState('');
  const [printerStatus, setPrinterStatus] = useState<any>(null);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [pendingBillData, setPendingBillData] = useState<any>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  // Barcode scanner listener
  useEffect(() => {
    const handleBarcodeScan = async (_event: any, data: { barcode: string }) => {
      console.log('Barcode scanned:', data.barcode);
      setLastScan(data.barcode);
      
      // Find product by barcode
      const result = await (window as any).electron.products.findByBarcode(data.barcode);
      if (result.success && result.data) {
        addToCart(result.data);
        // Flash feedback
        setTimeout(() => setLastScan(''), 2000);
      } else {
        showToast('Product not found for barcode: ' + data.barcode, 'error');
      }
    };

    (window as any).electron.barcode.onScan(handleBarcodeScan);

    return () => {
      (window as any).electron.barcode.removeScanListener(handleBarcodeScan);
    };
  }, [cart]);

  // Load printer status
  useEffect(() => {
    const loadPrinterStatus = async () => {
      try {
        const result = await (window as any).electron.printer.getStatus();
        if (result.success) {
          setPrinterStatus(result.data);
        }
      } catch (error) {
        console.error('Error loading printer status:', error);
      }
    };

    loadPrinterStatus();
    // Refresh printer status every 5 seconds
    const interval = setInterval(loadPrinterStatus, 5000);
    return () => clearInterval(interval);
  }, []);

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

  // Add product to cart
  const addToCart = (product: any) => {
    const existingIndex = cart.findIndex(item => item.product_id === product.product_id);
    
    if (existingIndex >= 0) {
      // Increase quantity
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      newCart[existingIndex].total_price = newCart[existingIndex].quantity * newCart[existingIndex].unit_price;
      setCart(newCart);
    } else {
      // Add new item
      setCart([...cart, {
        product_id: product.product_id,
        product_name: product.product_name,
        barcode: product.barcode,
        quantity: 1,
        unit_price: product.selling_price,
        total_price: product.selling_price
      }]);
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
      removeFromCart(index);
      return;
    }

    const newCart = [...cart];
    newCart[index].quantity = newQuantity;
    newCart[index].total_price = newQuantity * newCart[index].unit_price;
    setCart(newCart);
  };

  // Remove from cart
  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.total_price, 0);
  const discountAmount = (subtotal * discountPercent) / 100;
  const total = subtotal - discountAmount;

  // Generate preview data for sample receipt
  const generatePreviewData = () => {
    const billNumber = 'BILL-' + Date.now().toString().slice(-6);
    return {
      bill_number: billNumber,
      bill_date: new Date().toISOString(),
      customer_name: customerName || null,
      customer_phone: customerPhone || null,
      subtotal: subtotal,
      discount_amount: discountAmount,
      discount_percentage: discountPercent,
      total_amount: total,
      payment_mode: paymentMode,
      paid_amount: total,
      balance_amount: 0,
      items: cart.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        barcode: item.barcode,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price
      }))
    };
  };

  // Print bill
  const printBill = async (billData: any) => {
    if (!printerStatus?.connected) {
      console.log('Printer not connected, skipping print');
      return { success: true, message: 'Bill created (not printed - printer not connected)' };
    }

    try {
      const shopInfo = getShopInfo();
      const printResult = await (window as any).electron.printer.printBill(billData, shopInfo);
      if (printResult.success) {
        return { success: true, message: 'Bill created and printed successfully' };
      } else {
        console.error('Print failed:', printResult.error);
        return { success: true, message: 'Bill created (print failed: ' + printResult.error + ')' };
      }
    } catch (error) {
      console.error('Print error:', error);
      return { success: true, message: 'Bill created (print error: ' + error + ')' };
    }
  };

  // Process bill
  const handleProcessBill = async () => {
    if (cart.length === 0) {
      showToast('Cart is empty!', 'warning');
      return;
    }

    setProcessing(true);

    try {
      const billData = {
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        subtotal: subtotal,
        discount_amount: discountAmount,
        discount_percentage: discountPercent,
        total_amount: total,
        payment_mode: paymentMode,
        paid_amount: total,
        balance_amount: 0,
        items: cart.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          barcode: item.barcode,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        }))
      };

      const result = await (window as any).electron.bills.create(billData);

      if (result.success) {
        // Add bill date and items to bill data for printing
        const billForPrint = {
          ...billData,
          bill_number: result.billNumber,
          bill_date: new Date().toISOString()
        };
        
        // Store pending bill and show preview
        setPendingBillData(billForPrint);
        setShowReceiptPreview(true);
        
        showToast('Bill created! Review and print.', 'info');
        setProcessing(false);
      } else {
        showToast('Error creating bill: ' + result.error, 'error');
        setProcessing(false);
      }
    } catch (error) {
      showToast('Error: ' + error, 'error');
      setProcessing(false);
    }
  };

  // Confirm and print from preview
  const confirmAndPrint = async () => {
    setShowReceiptPreview(false);
    
    if (pendingBillData) {
      setProcessing(true);
      const printResult = await printBill(pendingBillData);
      console.log("printResult:", printResult.message);
      
      showToast(`${printResult.message}! Bill: ${pendingBillData.bill_number}`, 'success');
      
      // Clear cart
      setCart([]);
      setDiscountPercent(0);
      setCustomerName('');
      setCustomerPhone('');
      setPaymentMode('CASH');
      setSearchQuery('');
      setSearchResults([]);
      setShowSearchResults(false);
      setPendingBillData(null);
      console.log('Cart and search cleared after bill processing.');
      setProcessing(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">New Bill</h1>
        <div className="flex items-center gap-4">
          {lastScan && (
            <div className="bg-green-500 px-4 py-2 rounded animate-pulse">
              ✓ Scanned: {lastScan}
            </div>
          )}
          <div className="text-sm flex items-center gap-2">
            📷 Scanner Ready
            <span className={`px-2 py-1 rounded text-xs ${
              printerStatus?.connected 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {printerStatus?.connected ? '🖨️ Printer Ready' : '🖨️ Printer Offline'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Side - Product Search & Cart */}
        <div className="flex-1 p-4 flex flex-col">
          {/* Search Box */}
          <div className="mb-4 relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              // onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
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
                    onClick={() => addToCart(product)}
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

          {/* Cart Items */}
          <div className="flex-1 bg-white rounded-lg shadow overflow-hidden">
            {cart.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="text-6xl mb-4">🛒</div>
                  <div className="text-xl">Cart is empty</div>
                  <div className="text-sm mt-2">Search or scan products to add</div>
                </div>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Product</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Qty</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Price</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Total</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, index) => (
                    <tr key={index} className="border-t">
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
                          onClick={() => removeFromCart(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Side - Bill Summary */}
        <div className="w-96 bg-white p-6 shadow-lg flex flex-col">
          {/* Customer Info */}
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Customer (Optional)</h3>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer Name"
              className="w-full px-3 py-2 border rounded mb-2"
            />
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Phone Number"
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          {/* Totals */}
          <div className="flex-1">
            <div className="space-y-3 text-lg">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span>Discount:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                    className="w-16 px-2 py-1 border rounded text-right"
                    min="0"
                    max="100"
                  />
                  <span>%</span>
                  <span className="font-semibold">₹{discountAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="border-t pt-3 flex justify-between text-2xl font-bold text-blue-600">
                <span>TOTAL:</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Mode */}
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Payment Mode</h3>
            <div className="grid grid-cols-2 gap-2">
              {['CASH', 'UPI', 'CARD', 'CREDIT'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setPaymentMode(mode)}
                  className={`px-4 py-2 rounded font-semibold ${
                    paymentMode === mode
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <button
              onClick={handleProcessBill}
              disabled={cart.length === 0 || processing}
              className="w-full py-4 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-700 disabled:bg-gray-400"
            >
              {processing ? 'Processing...' : 'CREATE & PRINT BILL'}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowReceiptPreview(true)}
                disabled={cart.length === 0}
                className="py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
              >
                👁️ Preview
              </button>
              <button
                onClick={() => {
                  if (confirm('Clear cart?')) {
                    setCart([]);
                    setDiscountPercent(0);
                  }
                }}
                className="py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Preview Modal */}
      {showReceiptPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Bill Preview</h2>
                <button
                  onClick={() => {
                    setShowReceiptPreview(false);
                    setPendingBillData(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-4">
              <SampleReceipt 
                billData={pendingBillData || generatePreviewData()}
                shopInfo={getShopInfo()}
              />
            </div>
            <div className="p-4 border-t bg-gray-50">
              <div className="flex gap-2">
                <button
                  onClick={confirmAndPrint}
                  disabled={processing}
                  className="flex-1 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400"
                >
                  🖨️ Print Bill
                </button>
                <button
                  onClick={() => {
                    setShowReceiptPreview(false);
                    setPendingBillData(null);
                  }}
                  className="flex-1 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingScreen;