import React, { useEffect, useState } from 'react';

const Dashboard: React.FC = () => {
  const [todaysSales, setTodaysSales] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const result = await (window as any).electron.reports.dailySales(
        new Date().toISOString().split('T')[0]
      );
      
      if (result.success) {
        setTodaysSales(result.data);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  const summary = todaysSales?.summary || {};

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

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
      {todaysSales?.topItems?.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Top Selling Items Today</h2>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Product</th>
                <th className="px-4 py-2 text-center">Quantity</th>
                <th className="px-4 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {todaysSales.topItems.map((item: any, index: number) => (
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