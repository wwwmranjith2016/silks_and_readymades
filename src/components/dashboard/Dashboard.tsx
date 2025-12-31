import React, { useEffect, useState } from 'react';

type Period = 'today' | 'weekly' | 'monthly' | 'monthtodate';

const Dashboard: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('today');
  const [salesData, setSalesData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Calculate date range based on selected period
  const getDateRange = (period: Period) => {
    const today = new Date();
    
    switch (period) {
      case 'today':
        const todayStr = today.toISOString().split('T')[0];
        return { startDate: todayStr, endDate: todayStr, label: 'Today' };
        
      case 'weekly':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)
        return {
          startDate: weekStart.toISOString().split('T')[0],
          endDate: weekEnd.toISOString().split('T')[0],
          label: 'This Week'
        };
        
      case 'monthly':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return {
          startDate: monthStart.toISOString().split('T')[0],
          endDate: monthEnd.toISOString().split('T')[0],
          label: 'This Month'
        };
        
      case 'monthtodate':
        const mtdStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const mtdEnd = today;
        return {
          startDate: mtdStart.toISOString().split('T')[0],
          endDate: mtdEnd.toISOString().split('T')[0],
          label: 'Month to Date'
        };
        
      default:
        return { startDate: '', endDate: '', label: '' };
    }
  };

  const loadDashboardData = async (period: Period = selectedPeriod) => {
    try {
      setLoading(true);
      const dateRange = getDateRange(period);
      
      let result;
      if (period === 'today') {
        // Use daily sales API for today
        result = await (window as any).electron.reports.dailySales(dateRange.startDate);
      } else {
        // Use date range API for weekly/monthly
        result = await (window as any).electron.reports.salesByDateRange(
          dateRange.startDate,
          dateRange.endDate
        );
      }
      
      if (result.success) {
        const data = {
          ...result.data,
          periodLabel: dateRange.label,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        };
        
        setSalesData(data);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (period: Period) => {
    setSelectedPeriod(period);
    loadDashboardData(period);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const summary = salesData?.summary || {};

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        
        {/* Period Selector */}
        <div className="flex bg-white rounded-lg shadow p-1">
          <button
            onClick={() => handlePeriodChange('today')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedPeriod === 'today'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => handlePeriodChange('weekly')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedPeriod === 'weekly'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => handlePeriodChange('monthtodate')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedPeriod === 'monthtodate'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Month to Date
          </button>
          <button
            onClick={() => handlePeriodChange('monthly')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedPeriod === 'monthly'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Full Month
          </button>
        </div>
      </div>

      {/* Period Info */}
      {salesData && (
        <div className="mb-6">
          <p className="text-gray-600">
            Showing data for <span className="font-semibold">{salesData.periodLabel}</span>
            {selectedPeriod !== 'today' && (
              <span className="text-sm ml-2">
                ({new Date(salesData.startDate).toLocaleDateString()} - {new Date(salesData.endDate).toLocaleDateString()})
              </span>
            )}
          </p>
          

        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm mb-1">Total Sales</div>
          <div className="text-3xl font-bold text-blue-600">
            ₹{(summary.total_sales || 0).toFixed(2)}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm mb-1">Total Bills</div>
          <div className="text-3xl font-bold text-green-600">
            {summary.total_bills || 0}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm mb-1">Average Bill</div>
          <div className="text-3xl font-bold text-purple-600">
            ₹{summary.total_bills > 0 
              ? (summary.total_sales / summary.total_bills).toFixed(2)
              : '0.00'}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm mb-1">Credit Sales</div>
          <div className="text-3xl font-bold text-orange-600">
            ₹{(summary.credit_sales || 0).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Payment Mode Breakdown */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Payment Mode Breakdown</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-green-50 rounded">
            <div className="text-2xl font-bold text-green-600">
              ₹{(summary.cash_sales || 0).toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">Cash</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded">
            <div className="text-2xl font-bold text-blue-600">
              ₹{(summary.upi_sales || 0).toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">UPI</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded">
            <div className="text-2xl font-bold text-purple-600">
              ₹{(summary.card_sales || 0).toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">Card</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded">
            <div className="text-2xl font-bold text-orange-600">
              ₹{(summary.credit_sales || 0).toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">Credit</div>
          </div>
        </div>
      </div>

      {/* Top Selling Items */}
      {salesData?.topItems?.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">
            Top Selling Items - {salesData.periodLabel}
          </h2>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Product</th>
                <th className="px-4 py-2 text-center">Quantity</th>
                <th className="px-4 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {salesData.topItems.map((item: any, index: number) => (
                <tr key={index} className="border-t">
                  <td className="px-4 py-2">{item.product_name}</td>
                  <td className="px-4 py-2 text-center">{item.total_quantity}</td>
                  <td className="px-4 py-2 text-right">₹{item.total_amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Dashboard;