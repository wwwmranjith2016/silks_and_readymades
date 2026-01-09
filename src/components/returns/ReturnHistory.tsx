import React, { useEffect, useState, useMemo } from 'react';
import { useToast } from '../common/ToastContext';
import { ReturnWithItems, ReturnFilters } from '../../types/returnTypes';
import { formatCurrency, formatDate, getReturnStatusBadgeColor } from '../../utils/returnUtils';

interface ReturnHistoryProps {
  onBack: () => void;
}

const ReturnHistory: React.FC<ReturnHistoryProps> = ({ onBack }) => {
  const [returns, setReturns] = useState<ReturnWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReturn, setSelectedReturn] = useState<ReturnWithItems | null>(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [filters, setFilters] = useState<ReturnFilters>({
    search_query: '',
    date_from: '',
    date_to: '',
    status: '',
    customer_name: ''
  });
  const { showToast } = useToast();

  useEffect(() => {
    loadReturns();
  }, []);

  const loadReturns = async () => {
    try {
      const result = await (window as any).electron.returns.getAll();
      if (result.success) {
        setReturns(result.data);
      }
    } catch (error) {
      console.error('Error loading returns:', error);
      showToast('Error loading returns: ' + error, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filter returns based on search criteria
  const filteredReturns = useMemo(() => {
    let filtered = returns;

    if (filters.search_query) {
      filtered = filtered.filter(returnTransaction => {
        const searchableFields = [
          returnTransaction.return_id?.toString() || '',
          returnTransaction.customer_name?.toLowerCase() || '',
          returnTransaction.customer_phone?.toString() || '',
          returnTransaction.return_reason?.toLowerCase() || '',
          formatDate(returnTransaction.return_date).toLowerCase()
        ];
        return searchableFields.some(field => 
          field.includes(filters.search_query!.toLowerCase())
        );
      });
    }

    if (filters.date_from) {
      filtered = filtered.filter(rt => 
        new Date(rt.return_date) >= new Date(filters.date_from!)
      );
    }

    if (filters.date_to) {
      filtered = filtered.filter(rt => 
        new Date(rt.return_date) <= new Date(filters.date_to!)
      );
    }

    if (filters.status) {
      filtered = filtered.filter(rt => rt.status === filters.status);
    }

    if (filters.customer_name) {
      filtered = filtered.filter(rt => 
        rt.customer_name?.toLowerCase().includes(filters.customer_name!.toLowerCase())
      );
    }

    return filtered.sort((a, b) => 
      new Date(b.return_date).getTime() - new Date(a.return_date).getTime()
    );
  }, [returns, filters]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const total = filteredReturns.length;
    const pending = filteredReturns.filter(rt => rt.status === 'PENDING').length;
    const completed = filteredReturns.filter(rt => rt.status === 'COMPLETED').length;
    const totalValue = filteredReturns.reduce((sum, rt) => sum + rt.total_return_value, 0);
    const exchangeValue = filteredReturns.reduce((sum, rt) => sum + rt.total_exchange_value, 0);

    return { total, pending, completed, totalValue, exchangeValue };
  }, [filteredReturns]);

  const handleReturnClick = (returnTransaction: ReturnWithItems) => {
    setSelectedReturn(returnTransaction);
    setShowReturnModal(true);
  };

  const updateReturnStatus = async (returnId: number, newStatus: string) => {
    try {
      const result = await (window as any).electron.returns.updateStatus(returnId, newStatus);
      if (result.success) {
        showToast(`Return status updated to ${newStatus}`, 'success');
        loadReturns(); // Reload to reflect changes
        setShowReturnModal(false);
      } else {
        showToast('Error updating status: ' + result.error, 'error');
      }
    } catch (error) {
      showToast('Error updating status: ' + error, 'error');
    }
  };

  const printReturnReceipt = async (returnTransaction: ReturnWithItems) => {
    try {
      const result = await (window as any).electron.returns.printReceipt(returnTransaction.return_id);
      if (result.success) {
        showToast('Return receipt printed successfully', 'success');
      } else {
        showToast('Error printing receipt: ' + result.error, 'error');
      }
    } catch (error) {
      showToast('Error printing receipt: ' + error, 'error');
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading returns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="p-6 bg-white shadow flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-3xl font-bold">Return History</h1>
        </div>
        <div className="text-sm text-gray-600">
          {filteredReturns.length} of {returns.length} returns
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total Returns</div>
            <div className="text-2xl font-bold">{summaryStats.total}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Pending</div>
            <div className="text-2xl font-bold text-orange-600">{summaryStats.pending}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Completed</div>
            <div className="text-2xl font-bold text-green-600">{summaryStats.completed}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total Value</div>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(summaryStats.totalValue)}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Exchange Value</div>
            <div className="text-2xl font-bold text-purple-600">{formatCurrency(summaryStats.exchangeValue)}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <input
              type="text"
              placeholder="Search returns..."
              value={filters.search_query || ''}
              onChange={(e) => setFilters({...filters, search_query: e.target.value})}
              className="px-3 py-2 border rounded"
            />
            <input
              type="date"
              value={filters.date_from || ''}
              onChange={(e) => setFilters({...filters, date_from: e.target.value})}
              className="px-3 py-2 border rounded"
            />
            <input
              type="date"
              value={filters.date_to || ''}
              onChange={(e) => setFilters({...filters, date_to: e.target.value})}
              className="px-3 py-2 border rounded"
            />
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="px-3 py-2 border rounded"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <input
              type="text"
              placeholder="Customer name..."
              value={filters.customer_name || ''}
              onChange={(e) => setFilters({...filters, customer_name: e.target.value})}
              className="px-3 py-2 border rounded"
            />
          </div>
        </div>

        {/* Returns List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredReturns.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg className="mx-auto w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <p>No returns found</p>
              <p className="text-sm">Try adjusting your filters or process a new return</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Return ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Return Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exchange Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredReturns.map((returnTransaction) => (
                    <tr 
                      key={returnTransaction.return_id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleReturnClick(returnTransaction)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap font-semibold text-blue-600">
                        RET-{returnTransaction.return_id.toString().padStart(6, '0')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(returnTransaction.return_date)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {returnTransaction.customer_name || 'Walk-in'}
                        {returnTransaction.customer_phone && (
                          <div className="text-gray-500">{returnTransaction.customer_phone}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-green-600">
                        {formatCurrency(returnTransaction.total_return_value)}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-blue-600">
                        {formatCurrency(returnTransaction.total_exchange_value)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`font-semibold ${
                          returnTransaction.balance_amount > 0 ? 'text-orange-600' : 'text-purple-600'
                        }`}>
                          {returnTransaction.balance_amount > 0 ? '+' : ''}
                          {formatCurrency(returnTransaction.balance_amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getReturnStatusBadgeColor(returnTransaction.status)}`}>
                          {returnTransaction.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              printReturnReceipt(returnTransaction);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                            title="Print Receipt"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Return Details Modal */}
      {showReturnModal && selectedReturn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex-shrink-0 p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">
                  Return Details - RET-{selectedReturn.return_id.toString().padStart(6, '0')}
                </h2>
                <button
                  onClick={() => setShowReturnModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Return Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Return Information</h3>
                  <div className="space-y-1 text-sm">
                    <div><span className="font-medium">Return ID:</span> RET-{selectedReturn.return_id.toString().padStart(6, '0')}</div>
                    <div><span className="font-medium">Date:</span> {formatDate(selectedReturn.return_date)}</div>
                    <div><span className="font-medium">Original Bill ID:</span> {selectedReturn.original_bill_id}</div>
                    <div><span className="font-medium">Status:</span> 
                      <span className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${getReturnStatusBadgeColor(selectedReturn.status)}`}>
                        {selectedReturn.status}
                      </span>
                    </div>
                    {selectedReturn.return_reason && (
                      <div><span className="font-medium">Reason:</span> {selectedReturn.return_reason}</div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Customer Information</h3>
                  <div className="space-y-1 text-sm">
                    <div><span className="font-medium">Customer:</span> {selectedReturn.customer_name || 'Walk-in Customer'}</div>
                    {selectedReturn.customer_phone && (
                      <div><span className="font-medium">Phone:</span> {selectedReturn.customer_phone}</div>
                    )}
                    {selectedReturn.notes && (
                      <div><span className="font-medium">Notes:</span> {selectedReturn.notes}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Return Items */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Returned Items</h3>
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
                      {selectedReturn.return_items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm">
                            <div className="font-medium">{item.product_name}</div>
                            {item.product_code && (
                              <div className="text-gray-500 text-xs">{item.product_code}</div>
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm text-center">{item.quantity}</td>
                          <td className="px-4 py-2 text-sm text-right">{formatCurrency(item.unit_price)}</td>
                          <td className="px-4 py-2 text-sm text-right font-medium">{formatCurrency(item.total_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Exchange Items */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Exchange Items</h3>
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
                      {selectedReturn.exchange_items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm">
                            <div className="font-medium">{item.product_name}</div>
                            {item.product_code && (
                              <div className="text-gray-500 text-xs">{item.product_code}</div>
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm text-center">{item.quantity}</td>
                          <td className="px-4 py-2 text-sm text-right">{formatCurrency(item.unit_price)}</td>
                          <td className="px-4 py-2 text-sm text-right font-medium">{formatCurrency(item.total_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary */}
              <div className="border-t pt-4">
                <div className="flex justify-end">
                  <div className="w-64">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Return Value:</span>
                        <span className="font-semibold text-green-600">{formatCurrency(selectedReturn.total_return_value)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Exchange Value:</span>
                        <span className="font-semibold text-blue-600">{formatCurrency(selectedReturn.total_exchange_value)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold border-t pt-2">
                        <span>Balance:</span>
                        <span className={selectedReturn.balance_amount > 0 ? 'text-orange-600' : 'text-purple-600'}>
                          {selectedReturn.balance_amount > 0 ? '+' : ''}{formatCurrency(selectedReturn.balance_amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex-shrink-0 p-6 border-t bg-gray-50">
              <div className="flex justify-between">
                <div className="flex gap-2">
                  {selectedReturn.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => updateReturnStatus(selectedReturn.return_id, 'COMPLETED')}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        Mark Completed
                      </button>
                      <button
                        onClick={() => updateReturnStatus(selectedReturn.return_id, 'CANCELLED')}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                      >
                        Cancel Return
                      </button>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => printReturnReceipt(selectedReturn)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Print Receipt
                  </button>
                  <button
                    onClick={() => setShowReturnModal(false)}
                    className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReturnHistory;