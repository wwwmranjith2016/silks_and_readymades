import React, { useState } from 'react';
import { useToast } from '../common/ToastContext';
import { 
  ReturnItem, 
  ExchangeItem, 
  ReturnSummary, 
  BillSearchResult, 
  ReturnProcessData 
} from '../../types/returnTypes';
import { 
  calculateReturnSummary, 
  // validateReturnData, 
  validateStockAvailability,
  formatCurrency,
  debugReturnTransaction,
  validateReturnDataWithLogging
} from '../../utils/returnUtils';
import ExchangeSelector from './ExchangeSelector';

interface ReturnProcessProps {
  onComplete: (returnData: ReturnProcessData) => Promise<void>;
  onCancel: () => void;
}

const ReturnProcess: React.FC<ReturnProcessProps> = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState(1); // 1: Search Bill, 2: Select Return Items, 3: Select Exchange Items, 4: Summary
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BillSearchResult[]>([]);
  const [selectedBill, setSelectedBill] = useState<BillSearchResult | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [exchangeItems, setExchangeItems] = useState<ExchangeItem[]>([]);
  const [showExchangeSelector, setShowExchangeSelector] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const { showToast } = useToast();

  // Load bills for search
  const searchBills = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const result = await (window as any).electron.bills.search(query);
      if (result.success) {
        // Filter out return bills (eligible for return only)
        const eligibleBills = result.data.filter((bill: any) => !bill.is_return);
        setSearchResults(eligibleBills);
      }
    } catch (error) {
      showToast('Error searching bills: ' + error, 'error');
    }
  };

  // Handle bill selection
  const handleBillSelect = (bill: BillSearchResult) => {
    setSelectedBill(bill);
    setCustomerName(bill.customer_name || '');
    setCustomerPhone(bill.customer_phone || '');
    
    // Pre-populate return items with all bill items
    const prePopulatedReturnItems: ReturnItem[] = bill.items.map((item) => ({
      return_item_id: 0,
      return_id: 0,
      product_id: item.product_id,
      product_name: item.product_name,
      product_code: item.product_code,
      barcode: item.barcode,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price
    }));
    
    setReturnItems(prePopulatedReturnItems);
    setStep(2);
  };

  // Update return item quantity
  const updateReturnItemQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 0) return;
    
    const updatedItems = [...returnItems];
    updatedItems[index].quantity = newQuantity;
    updatedItems[index].total_price = newQuantity * updatedItems[index].unit_price;
    setReturnItems(updatedItems);
  };

  // Remove return item
  const removeReturnItem = (index: number) => {
    const updatedItems = returnItems.filter((_, i) => i !== index);
    setReturnItems(updatedItems);
  };

  // Add exchange item
  // const addExchangeItem = (product: any) => {
  //   const existingIndex = exchangeItems.findIndex(item => item.product_id === product.product_id);
    
  //   if (existingIndex >= 0) {
  //     // Increase quantity
  //     const updatedItems = [...exchangeItems];
  //     updatedItems[existingIndex].quantity += 1;
  //     updatedItems[existingIndex].total_price = updatedItems[existingIndex].quantity * updatedItems[existingIndex].unit_price;
  //     setExchangeItems(updatedItems);
  //   } else {
  //     // Add new item
  //     const newItem: ExchangeItem = {
  //       exchange_item_id: 0,
  //       return_id: 0,
  //       product_id: product.product_id,
  //       product_name: product.product_name,
  //       product_code: product.product_code,
  //       barcode: product.barcode,
  //       quantity: 1,
  //       unit_price: product.selling_price,
  //       total_price: product.selling_price
  //     };
  //     setExchangeItems([...exchangeItems, newItem]);
  //   }
  // };

  // Update exchange item quantity
  const updateExchangeItemQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      const updatedItems = exchangeItems.filter((_, i) => i !== index);
      setExchangeItems(updatedItems);
      return;
    }
    
    const updatedItems = [...exchangeItems];
    updatedItems[index].quantity = newQuantity;
    updatedItems[index].total_price = newQuantity * updatedItems[index].unit_price;
    setExchangeItems(updatedItems);
  };

  // Remove exchange item
  const removeExchangeItem = (index: number) => {
    const updatedItems = exchangeItems.filter((_, i) => i !== index);
    setExchangeItems(updatedItems);
  };

  // Calculate summary
  const summary: ReturnSummary = calculateReturnSummary(returnItems, exchangeItems);

  // Handle process return
  const handleProcessReturn = async () => {
    if (!selectedBill) {
      showToast('Please select a bill to return', 'warning');
      return;
    }

    const validation = validateReturnDataWithLogging(selectedBill.bill_id, returnItems, exchangeItems);
    if (!validation.isValid) {
      showToast(validation.errors[0], 'error');
      return;
    }

    // Validate stock availability
    const stockValidation = await validateStockAvailability(exchangeItems);
    if (!stockValidation.isValid) {
      const insufficientItems = stockValidation.insufficientStock.map(item => 
        `${item.product_name} (Requested: ${item.requested}, Available: ${item.available})`
      ).join(', ');
      showToast(`Insufficient stock: ${insufficientItems}`, 'error');
      return;
    }

    setProcessing(true);

    try {
      // Debug logging
      console.log('=== RETURN PROCESSING FRONTEND DEBUG ===');
      console.log('Return items:', returnItems);
      console.log('Exchange items:', exchangeItems);
      console.log('Selected bill:', selectedBill);
      
      // Validate quantities before sending
      const validatedReturnItems = returnItems.filter(item => item.quantity > 0);
      const validatedExchangeItems = exchangeItems.filter(item => item.quantity > 0);
      
      console.log('Validated return items:', validatedReturnItems);
      console.log('Validated exchange items:', validatedExchangeItems);
      
      // Double-check total calculations
      const returnTotal = validatedReturnItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      const exchangeTotal = validatedExchangeItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      
      console.log('Calculated return total:', returnTotal);
      console.log('Calculated exchange total:', exchangeTotal);
      console.log('Expected balance:', exchangeTotal - returnTotal);

      const returnData: ReturnProcessData = {
        original_bill_id: selectedBill.bill_id,
        customer_name: customerName || selectedBill.customer_name,
        customer_phone: customerPhone || selectedBill.customer_phone,
        return_reason: returnReason,
        notes: notes,
        return_items: validatedReturnItems.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          product_code: item.product_code,
          barcode: item.barcode,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.quantity * item.unit_price // Recalculate to ensure accuracy
        })),
        exchange_items: validatedExchangeItems.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          product_code: item.product_code,
          barcode: item.barcode,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.quantity * item.unit_price // Recalculate to ensure accuracy
        }))
      };
      
      console.log('Final return data to send:', JSON.stringify(returnData, null, 2));
      
      // Debug the complete transaction
      debugReturnTransaction(returnData);
      
      console.log('=== END FRONTEND DEBUG ===');

      await onComplete(returnData);
      showToast('Return processed successfully!', 'success');
    } catch (error) {
      console.error('Return processing error:', error);
      showToast('Error processing return: ' + error, 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Search products for exchange
  // const searchExchangeProducts = async (query: string) => {
  //   if (query.length < 2) return [];
    
  //   try {
  //     const result = await (window as any).electron.products.search(query);
  //     return result.success ? result.data : [];
  //   } catch (error) {
  //     console.error('Error searching products:', error);
  //     return [];
  //   }
  // };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="p-4 bg-white shadow flex justify-between items-center">
        <h1 className="text-2xl font-bold">Process Return</h1>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            Step {step} of 4
          </div>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="p-4 bg-white border-b">
        <div className="flex justify-between items-center">
          {[
            { number: 1, title: 'Search Bill', active: step >= 1 },
            { number: 2, title: 'Return Items', active: step >= 2 },
            { number: 3, title: 'Exchange Items', active: step >= 3 },
            { number: 4, title: 'Summary', active: step >= 4 }
          ].map((stepItem, index) => (
            <div key={stepItem.number} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                stepItem.active ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                {stepItem.number}
              </div>
              <div className={`ml-2 text-sm ${stepItem.active ? 'font-semibold text-blue-600' : 'text-gray-500'}`}>
                {stepItem.title}
              </div>
              {index < 3 && (
                <div className={`w-16 h-1 mx-4 ${
                  step > stepItem.number ? 'bg-blue-600' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {/* Step 1: Search Bill */}
        {step === 1 && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold mb-4">Search Original Bill</h2>
            <div className="mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchBills(e.target.value);
                }}
                placeholder="Search by bill number, customer name, phone, or amount..."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            
            {searchResults.length > 0 && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-4 py-2 bg-gray-50 border-b">
                  <h3 className="font-semibold">Select a Bill to Return</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {searchResults.map((bill) => (
                    <div
                      key={bill.bill_id}
                      onClick={() => handleBillSelect(bill)}
                      className="p-4 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-blue-600">{bill.bill_number}</div>
                          <div className="text-sm text-gray-600">
                            {bill.customer_name || 'Walk-in'} | {bill.customer_phone || 'No phone'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(bill.bill_date).toLocaleDateString()} | {bill.items.length} items
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrency(bill.total_amount)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Select Return Items */}
        {step === 2 && selectedBill && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-semibold mb-4">Select Items to Return</h2>
            
            {/* Customer Info */}
            <div className="bg-white rounded-lg p-4 mb-4">
              <h3 className="font-semibold mb-2">Customer Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer Name"
                  className="px-3 py-2 border rounded"
                />
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Phone Number"
                  className="px-3 py-2 border rounded"
                />
              </div>
            </div>

            {/* Return Items */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b">
                <h3 className="font-semibold">Bill Items (Select quantities to return)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Product</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">Original Qty</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">Return Qty</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">Price</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">Total</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnItems.map((item, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-4 py-3">
                          <div className="font-medium">{item.product_name}</div>
                          <div className="text-xs text-gray-500">{item.barcode}</div>
                        </td>
                        <td className="px-4 py-3 text-center">{item.quantity}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => updateReturnItemQuantity(index, item.quantity - 1)}
                              className="w-8 h-8 bg-gray-200 rounded hover:bg-gray-300"
                              disabled={item.quantity <= 0}
                            >
                              -
                            </button>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateReturnItemQuantity(index, parseInt(e.target.value) || 0)}
                              className="w-16 text-center border rounded px-2 py-1"
                              min="0"
                              max={item.quantity}
                            />
                            <button
                              onClick={() => updateReturnItemQuantity(index, item.quantity + 1)}
                              className="w-8 h-8 bg-gray-200 rounded hover:bg-gray-300"
                              disabled={item.quantity >= (selectedBill.items[index]?.quantity || 0)}
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">₹{item.unit_price.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-semibold">₹{item.total_price.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          {item.quantity > 0 && (
                            <button
                              onClick={() => removeReturnItem(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              ✕
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={returnItems.filter(item => item.quantity > 0).length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                Next: Select Exchange Items
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Select Exchange Items */}
        {step === 3 && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-semibold mb-4">Select Exchange Items</h2>
            
            {/* Add Products Button */}
            <div className="bg-white rounded-lg p-6 mb-4 text-center">
              <div className="mb-4">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-lg font-semibold mb-2">Search and Add Products</h3>
                <p className="text-gray-600 mb-4">Click below to search for products by name, barcode, or scan them directly</p>
              </div>
              <button
                onClick={() => setShowExchangeSelector(true)}
                className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors"
              >
                🔍 Search & Add Products
              </button>
            </div>
            
            {/* Exchange Items List */}
            <div className="bg-white rounded-lg shadow overflow-hidden mb-4">
              <div className="px-4 py-2 bg-gray-50 border-b flex justify-between items-center">
                <h3 className="font-semibold">Selected Exchange Items</h3>
                {exchangeItems.length > 0 && (
                  <button
                    onClick={() => setShowExchangeSelector(true)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    + Add More
                  </button>
                )}
              </div>
              {exchangeItems.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <div className="text-4xl mb-2">🛒</div>
                  <div className="text-lg font-medium mb-2">No items selected</div>
                  <div className="text-sm">Click the search button above to add products</div>
                </div>
              ) : (
                <div className="overflow-x-auto">
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
                      {exchangeItems.map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="px-4 py-3">
                            <div className="font-medium">{item.product_name}</div>
                            <div className="text-xs text-gray-500">{item.barcode}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => updateExchangeItemQuantity(index, item.quantity - 1)}
                                className="w-8 h-8 bg-gray-200 rounded hover:bg-gray-300"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateExchangeItemQuantity(index, parseInt(e.target.value) || 1)}
                                className="w-16 text-center border rounded px-2 py-1"
                                min="1"
                              />
                              <button
                                onClick={() => updateExchangeItemQuantity(index, item.quantity + 1)}
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
                              onClick={() => removeExchangeItem(index)}
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

            <div className="mt-4 flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                disabled={exchangeItems.length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                Next: Summary
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Summary */}
        {step === 4 && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-semibold mb-4">Return Summary</h2>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-green-800 text-sm font-semibold">Return Value</div>
                <div className="text-2xl font-bold text-green-900">
                  {formatCurrency(summary.total_return_value)}
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-blue-800 text-sm font-semibold">Exchange Value</div>
                <div className="text-2xl font-bold text-blue-900">
                  {formatCurrency(summary.total_exchange_value)}
                </div>
              </div>
              <div className={`border rounded-lg p-4 ${
                summary.is_balance_positive 
                  ? 'bg-orange-50 border-orange-200' 
                  : 'bg-purple-50 border-purple-200'
              }`}>
                <div className={`text-sm font-semibold ${
                  summary.is_balance_positive ? 'text-orange-800' : 'text-purple-800'
                }`}>
                  {summary.is_balance_positive ? 'Customer Pays' : 'Customer Gets'}
                </div>
                <div className={`text-2xl font-bold ${
                  summary.is_balance_positive ? 'text-orange-900' : 'text-purple-900'
                }`}>
                  {formatCurrency(Math.abs(summary.balance_amount))}
                </div>
              </div>
            </div>

            {/* Additional Details */}
            <div className="bg-white rounded-lg p-4 mb-4">
              <h3 className="font-semibold mb-2">Additional Details</h3>
              <div className="grid grid-cols-1 gap-4">
                <input
                  type="text"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Return Reason (Optional)"
                  className="px-3 py-2 border rounded"
                />
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes (Optional)"
                  className="px-3 py-2 border rounded"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(3)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Back
              </button>
              <button
                onClick={handleProcessReturn}
                disabled={processing}
                className="px-8 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
              >
                {processing ? 'Processing...' : 'Complete Return'}
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Exchange Selector Modal */}
      {showExchangeSelector && (
        <ExchangeSelector
          exchangeItems={exchangeItems}
          onItemsChange={setExchangeItems}
          onClose={() => setShowExchangeSelector(false)}
        />
      )}
    </div>
  );
};

export default ReturnProcess;