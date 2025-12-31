import React, { useState, useEffect } from 'react';
import { useToast } from '../common/ToastContext';
import ReturnProcess from './ReturnProcess';
import ReturnHistory from './ReturnHistory';
import { ReturnProcessData, ReturnWithItems } from '../../types/returnTypes';
import { formatCurrency, formatDate } from '../../utils/returnUtils';

type ViewMode = 'main' | 'process' | 'history';

interface ReturnStats {
  todayReturns: number;
  pendingReturns: number;
  totalValue: number;
  avgReturnValue: number;
}

const ReturnScreen: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('main');
  const [stats, setStats] = useState<ReturnStats>({ todayReturns: 0, pendingReturns: 0, totalValue: 0, avgReturnValue: 0 });
  const [recentReturns, setRecentReturns] = useState<ReturnWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  // Handle return completion
  const handleReturnComplete = async (returnData: ReturnProcessData) => {
    try {
      // Create return transaction
      const result = await (window as any).electron.returns.create(returnData);
      
      if (result.success) {
        // Create return bill (for record keeping)
        const returnBillData = {
          customer_name: returnData.customer_name,
          customer_phone: returnData.customer_phone,
          subtotal: returnData.exchange_items.reduce((sum, item) => sum + item.total_price, 0),
          discount_amount: 0,
          discount_percentage: 0,
          total_amount: returnData.exchange_items.reduce((sum, item) => sum + item.total_price, 0),
          payment_mode: 'EXCHANGE',
          paid_amount: 0,
          balance_amount: 0,
          is_return: 1,
          original_bill_id: returnData.original_bill_id,
          notes: `Return: ${returnData.return_reason || 'No reason provided'}`,
          items: returnData.exchange_items.map(item => ({
            product_id: item.product_id,
            product_name: item.product_name,
            barcode: item.barcode,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price
          }))
        };

        await (window as any).electron.bills.create(returnBillData);
        
        showToast(`Return processed successfully! Return ID: ${result.returnId}`, 'success');
        setViewMode('main');
        
        // Reload return data to update stats and recent returns
        await loadReturnData();
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error processing return:', error);
      throw error; // Re-throw to be handled by ReturnProcess component
    }
  };

  // Handle return cancellation
  const handleReturnCancel = () => {
    setViewMode('main');
  };

  // Load return data and statistics
  useEffect(() => {
    loadReturnData();
  }, []);

  const loadReturnData = async () => {
    try {
      setLoading(true);
      const result = await (window as any).electron.returns.getAll();
      
      if (result.success) {
        const allReturns = result.data || [];
        
        // Calculate statistics
        const today = new Date().toISOString().split('T')[0];
        const todayReturns = allReturns.filter((rt: ReturnWithItems) => 
          rt.return_date.startsWith(today)
        ).length;
        
        const pendingReturns = allReturns.filter((rt: ReturnWithItems) => 
          rt.status === 'PENDING'
        ).length;
        
        const totalValue = allReturns.reduce((sum: number, rt: ReturnWithItems) => 
          sum + rt.total_return_value, 0
        );
        
        const avgReturnValue = allReturns.length > 0 ? totalValue / allReturns.length : 0;
        
        setStats({
          todayReturns,
          pendingReturns,
          totalValue,
          avgReturnValue
        });
        
        // Get recent returns (last 5)
        const recent = allReturns
          .sort((a: ReturnWithItems, b: ReturnWithItems) => 
            new Date(b.return_date).getTime() - new Date(a.return_date).getTime()
          )
          .slice(0, 5);
        
        setRecentReturns(recent);
      }
    } catch (error) {
      console.error('Error loading return data:', error);
      showToast('Error loading return data', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading return data...</p>
        </div>
      </div>
    );
  }

  if (viewMode === 'process') {
    return (
      <ReturnProcess
        onComplete={handleReturnComplete}
        onCancel={handleReturnCancel}
      />
    );
  }

  if (viewMode === 'history') {
    return (
      <ReturnHistory
        onBack={() => setViewMode('main')}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="p-6 bg-white shadow flex justify-between items-center">
        <h1 className="text-3xl font-bold">Returns & Exchanges</h1>
        <div className="text-sm text-gray-600">
          Manage customer returns and product exchanges
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today's Returns</p>
                <p className="text-3xl font-bold text-gray-900">{stats.todayReturns}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Returns</p>
                <p className="text-3xl font-bold text-orange-600">{stats.pendingReturns}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Return Value</p>
                <p className="text-3xl font-bold text-green-600">₹{stats.totalValue.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Return Value</p>
                <p className="text-3xl font-bold text-purple-600">₹{stats.avgReturnValue.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Main Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Process New Return */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Process New Return</h3>
              <p className="text-gray-600 mb-6">
                Start a new return transaction. Search for the original bill, select items to return, and choose exchange items.
              </p>
              <button
                onClick={() => setViewMode('process')}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Start New Return
              </button>
            </div>
          </div>

          {/* View Return History */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Return History</h3>
              <p className="text-gray-600 mb-6">
                View all return transactions, filter by date, customer, or status. Print return receipts and manage pending returns.
              </p>
              <button
                onClick={() => setViewMode('history')}
                className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                View History
              </button>
            </div>
          </div>
        </div>

        {/* Recent Returns Preview */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <h3 className="text-lg font-semibold">Recent Returns</h3>
            <button
              onClick={() => setViewMode('history')}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View All →
            </button>
          </div>
          <div className="p-6">
            {recentReturns.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="mx-auto w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <p>No recent returns found</p>
                <p className="text-sm">Process your first return to see it here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentReturns.map((returnTransaction) => (
                  <div key={returnTransaction.return_id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
                          </svg>
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">
                          RET-{returnTransaction.return_id.toString().padStart(6, '0')}
                        </div>
                        <div className="text-sm text-gray-500">
                          {returnTransaction.customer_name || 'Walk-in Customer'} • {formatDate(returnTransaction.return_date)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="font-semibold text-green-600">
                          {formatCurrency(returnTransaction.total_return_value)}
                        </div>
                        <div className="text-xs text-gray-500">Return Value</div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          returnTransaction.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          returnTransaction.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {returnTransaction.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Help */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">💡 How Returns Work</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-semibold mb-1">1. Search Bill</h4>
              <p>Find the original bill using bill number, customer details, or amount.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">2. Select Items</h4>
              <p>Choose which items to return and specify quantities.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">3. Exchange Items</h4>
              <p>Select replacement items. Handle price differences automatically.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReturnScreen;