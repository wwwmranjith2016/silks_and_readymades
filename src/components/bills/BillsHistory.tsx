import React, { useEffect, useState, useMemo } from 'react';
import { useToast } from '../common/ToastContext';
import BillEditModal from './BillEditModal';

const BillsHistory: React.FC = () => {
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [showBillModal, setShowBillModal] = useState(false);
  const [billDetails, setBillDetails] = useState<any>(null);
  const [loadingBillDetails, setLoadingBillDetails] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { showToast } = useToast();

  // Filter bills based on search query
  const filteredBills = useMemo(() => {
    if (!searchQuery.trim()) {
      return bills;
    }

    const query = searchQuery.toLowerCase().trim();
    return bills.filter(bill => {
      const searchableFields = [
        bill.bill_number?.toString() || '',
        bill.customer_name?.toLowerCase() || '',
        bill.customer_phone?.toString() || '',
        bill.payment_mode?.toLowerCase() || '',
        bill.total_amount?.toString() || '',
        new Date(bill.bill_date).toLocaleDateString().toLowerCase() || '',
        new Date(bill.bill_date).toLocaleString().toLowerCase() || ''
      ];
      return searchableFields.some(field => field.includes(query));
    });
  }, [bills, searchQuery]);

  useEffect(() => {
    loadBills();
  }, []);

  const loadBills = async () => {
    try {
      const result = await (window as any).electron.bills.getAll({});
      if (result.success) {
        setBills(result.data);
      }
    } catch (error) {
      console.error('Error loading bills:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const loadBillDetails = async (billId: number) => {
    setLoadingBillDetails(true);
    try {
      const result = await (window as any).electron.bills.getById(billId);
      if (result.success) {
        setBillDetails(result.data);
        setShowBillModal(true);
      } else {
        showToast('Error loading bill details: ' + result.error, 'error');
      }
    } catch (error) {
      showToast('Error loading bill details: ' + error, 'error');
    } finally {
      setLoadingBillDetails(false);
    }
  };

  const handleBillClick = (bill: any) => {
    setSelectedBill(bill);
    loadBillDetails(bill.bill_id);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedBill(null);
    // Reload bills to reflect any changes made
    loadBills();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Bills History</h1>
        {/* Search Bar */}
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search bills by number, customer, phone, payment mode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {searchQuery && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <button
                onClick={() => setSearchQuery('')}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search Results Info */}
      {searchQuery && (
        <div className="mb-6 text-sm text-gray-600">
          {filteredBills.length === 0 ? (
            <span>No bills found matching "{searchQuery}"</span>
          ) : (
            <span>
              Showing {filteredBills.length} of {bills.length} bills
              {searchQuery && (
                <span> matching "{searchQuery}"</span>
              )}
            </span>
          )}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">Loading bills...</div>
      ) : bills.length === 0 ? (<div className="text-center py-8 text-gray-500">
          No bills found. Create your first bill!
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Bill Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Payment
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Amount
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredBills.map((bill) => (
                <tr 
                  key={bill.bill_id} 
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleBillClick(bill)}
                >
                  <td className="px-6 py-4 whitespace-nowrap font-semibold text-blue-600">
                    {bill.bill_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(bill.bill_date)}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {bill.customer_name || 'Walk-in'}
                    {bill.customer_phone && (
                      <div className="text-gray-500">{bill.customer_phone}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      bill.payment_mode === 'CASH' ? 'bg-green-100 text-green-800' :
                      bill.payment_mode === 'UPI' ? 'bg-blue-100 text-blue-800' :
                      bill.payment_mode === 'CARD' ? 'bg-purple-100 text-purple-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {bill.payment_mode}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-semibold">
                    {formatCurrency(bill.total_amount)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {bill.is_return ? (
                      <div className="flex flex-col items-center gap-1">
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-purple-100 text-purple-800">
                          RETURN
                        </span>
                        {bill.original_bill_id && (
                          <span className="text-xs text-gray-500">
                            of #{bill.original_bill_id}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">
                        SALE
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBill(bill);
                        setShowEditModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1 rounded transition-colors"
                      title="Edit Bill"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bill Details Modal */}
      {showBillModal && billDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header - Fixed */}
            <div className="flex-shrink-0 p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Bill Details - {billDetails.bill_number}</h2>
                <button
                  onClick={() => setShowBillModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Bill Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Bill Information</h3>
                  <div className="space-y-1 text-sm">
                    <div><span className="font-medium">Bill Number:</span> {billDetails.bill_number}</div>
                    <div><span className="font-medium">Date:</span> {formatDate(billDetails.bill_date)}</div>
                    <div><span className="font-medium">Payment Mode:</span> 
                      <span className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${
                        billDetails.payment_mode === 'CASH' ? 'bg-green-100 text-green-800' :
                        billDetails.payment_mode === 'UPI' ? 'bg-blue-100 text-blue-800' :
                        billDetails.payment_mode === 'CARD' ? 'bg-purple-100 text-purple-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {billDetails.payment_mode}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Customer Information</h3>
                  <div className="space-y-1 text-sm">
                    <div><span className="font-medium">Customer:</span> {billDetails.customer_name || 'Walk-in Customer'}</div>
                    {billDetails.customer_phone && (
                      <div><span className="font-medium">Phone:</span> {billDetails.customer_phone}</div>
                    )}
                    {billDetails.notes && (
                      <div><span className="font-medium">Notes:</span> {billDetails.notes}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bill Items */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Items</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Qty</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {billDetails.items && billDetails.items.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm">
                            <div className="font-medium">{item.product_name || 'N/A'}</div>
                            {item.product_code && (
                              <div className="text-gray-500 text-xs">{item.product_code}</div>
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm text-center">{item.quantity || 'N/A'}</td>
                          <td className="px-4 py-2 text-sm text-right">{item.unit_price ? formatCurrency(item.unit_price) : '₹0.00'}</td>
                          <td className="px-4 py-2 text-sm text-right font-medium">{item.total_price ? formatCurrency(item.total_price) : '₹0.00'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bill Summary */}
              <div className="border-t pt-4">
                <div className="flex justify-end">
                  <div className="w-64">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(billDetails.subtotal)}</span>
                      </div>
                      {billDetails.discount_amount > 0 && (
                        <div className="flex justify-between text-red-600">
                          <span>Discount ({billDetails.discount_percentage}%):</span>
                          <span>-{formatCurrency(billDetails.discount_amount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-bold border-t pt-2">
                        <span>Total:</span>
                        <span>{formatCurrency(billDetails.total_amount)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Paid Amount:</span>
                        <span>{formatCurrency(billDetails.paid_amount)}</span>
                      </div>
                      {billDetails.balance_amount > 0 && (
                        <div className="flex justify-between text-sm text-orange-600">
                          <span>Balance:</span>
                          <span>{formatCurrency(billDetails.balance_amount)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer - Fixed */}
            <div className="flex-shrink-0 p-6 border-t bg-gray-50">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowBillModal(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay for bill details */}
      {loadingBillDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span>Loading bill details...</span>
            </div>
          </div>
        </div>
      )}

      {/* Bill Edit Modal */}
      {showEditModal && selectedBill && (
        <BillEditModal
          bill={selectedBill}
          isOpen={showEditModal}
          onClose={handleCloseEditModal}
          onSuccess={loadBills}
        />
      )}
    </div>
  );
};
export default BillsHistory;