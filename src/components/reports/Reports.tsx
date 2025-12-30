import React, { useState, useEffect } from 'react';
import { useToast } from '../common/ToastContext';

interface SalesReport {
  summary: {
    total_bills: number;
    total_sales: number;
    cash_sales: number;
    upi_sales: number;
    card_sales: number;
    credit_sales: number;
  };
  topItems: Array<{
    product_name: string;
    total_quantity: number;
    total_amount: number;
  }>;
}

interface InventoryReport {
  allProducts: Array<{
    product_id: number;
    product_name: string;
    stock_quantity: number;
    min_stock_level: number;
    category: string;
    selling_price: number;
  }>;
  lowStockProducts: Array<{
    product_id: number;
    product_name: string;
    stock_quantity: number;
    min_stock_level: number;
    category: string;
  }>;
  outOfStockProducts: Array<{
    product_id: number;
    product_name: string;
    category: string;
  }>;
}

interface FinancialReport {
  totalRevenue: number;
  totalProfit: number;
  totalTax: number;
  averageBillValue: number;
  periodComparison: {
    currentPeriod: number;
    previousPeriod: number;
    growthPercentage: number;
  };
}

const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState('sales');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [salesData, setSalesData] = useState<SalesReport | null>(null);
  const [inventoryData, setInventoryData] = useState<InventoryReport | null>(null);
  const [financialData, setFinancialData] = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadReports();
  }, [dateRange, activeTab]);

  const loadReports = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'sales':
          await loadSalesReport();
          break;
        case 'inventory':
          await loadInventoryReport();
          break;
        case 'financial':
          await loadFinancialReport();
          break;
      }
    } catch (error) {
      showToast(`Error loading ${activeTab} report: ${error}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadSalesReport = async () => {
    try {
      const result = await (window as any).electron.reports.salesByDateRange(
        dateRange.startDate,
        dateRange.endDate
      );
      if (result.success) {
        setSalesData(result.data);
      }
    } catch (error) {
      console.error('Error loading sales report:', error);
    }
  };

  const loadInventoryReport = async () => {
    try {
      const result = await (window as any).electron.reports.inventoryReport();
      if (result.success) {
        setInventoryData(result.data);
      }
    } catch (error) {
      console.error('Error loading inventory report:', error);
    }
  };

  const loadFinancialReport = async () => {
    try {
      const result = await (window as any).electron.reports.financialReport(
        dateRange.startDate,
        dateRange.endDate
      );
      if (result.success) {
        setFinancialData(result.data);
      }
    } catch (error) {
      console.error('Error loading financial report:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const tabs = [
    { id: 'sales', label: 'Sales Report', icon: '💰' },
    { id: 'inventory', label: 'Inventory Report', icon: '📦' },
    { id: 'financial', label: 'Financial Report', icon: '📊' }
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Reports</h1>
        <div className="flex gap-4 items-center">
          <div className="flex gap-2">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="self-center">to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={loadReports}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Sales Report */}
      {activeTab === 'sales' && salesData && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm font-medium text-gray-500">Total Sales</div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(salesData.summary.total_sales)}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm font-medium text-gray-500">Total Bills</div>
              <div className="text-2xl font-bold text-blue-600">
                {salesData.summary.total_bills}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm font-medium text-gray-500">Average Bill</div>
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(salesData.summary.total_sales / salesData.summary.total_bills)}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm font-medium text-gray-500">Top Category</div>
              <div className="text-2xl font-bold text-orange-600">
                {salesData.topItems[0]?.product_name.split(' ')[0] || 'N/A'}
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Payment Methods</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(salesData.summary.cash_sales)}
                </div>
                <div className="text-sm text-gray-500">Cash</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(salesData.summary.upi_sales)}
                </div>
                <div className="text-sm text-gray-500">UPI</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(salesData.summary.card_sales)}
                </div>
                <div className="text-sm text-gray-500">Card</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(salesData.summary.credit_sales)}
                </div>
                <div className="text-sm text-gray-500">Credit</div>
              </div>
            </div>
          </div>

          {/* Top Selling Items */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Top Selling Items</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity Sold</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {salesData.topItems.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.product_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.total_quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(item.total_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Report */}
      {activeTab === 'inventory' && inventoryData && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm font-medium text-gray-500">Low Stock Items</div>
              <div className="text-2xl font-bold text-orange-600">
                {inventoryData.lowStockProducts.length}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm font-medium text-gray-500">Out of Stock</div>
              <div className="text-2xl font-bold text-red-600">
                {inventoryData.outOfStockProducts.length}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm font-medium text-gray-500">Total Products</div>
              <div className="text-2xl font-bold text-blue-600">
                {(inventoryData.allProducts?.length || 0)}
              </div>
            </div>
          </div>

          {/* Low Stock Products */}
          {inventoryData.lowStockProducts.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4 text-orange-600">Low Stock Alert</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Stock</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min Level</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {inventoryData.lowStockProducts.map((product) => (
                      <tr key={product.product_id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {product.product_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product.stock_quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product.min_stock_level}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product.category}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                            Low Stock
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Out of Stock Products */}
          {inventoryData.outOfStockProducts.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4 text-red-600">Out of Stock</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {inventoryData.outOfStockProducts.map((product) => (
                      <tr key={product.product_id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {product.product_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product.category}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            Out of Stock
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* All Products Overview */}
          {inventoryData.allProducts && inventoryData.allProducts.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">All Products Overview</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min Level</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {inventoryData.allProducts?.map((product) => {
                      const isLowStock = product.stock_quantity <= product.min_stock_level && product.stock_quantity > 0;
                      const isOutOfStock = product.stock_quantity === 0;
                      
                      return (
                        <tr key={product.product_id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {product.product_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {product.category}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {product.stock_quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {product.min_stock_level}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(product.selling_price)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {isOutOfStock ? (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                Out of Stock
                              </span>
                            ) : isLowStock ? (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                                Low Stock
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                In Stock
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {inventoryData.lowStockProducts.length === 0 && inventoryData.outOfStockProducts.length === 0 && (
            <div className="bg-white p-6 rounded-lg shadow text-center">
              <div className="text-green-600 text-lg font-semibold">✅ All products are well stocked!</div>
              <div className="text-gray-500 mt-2">No low stock or out of stock items found.</div>
            </div>
          )}

          {inventoryData.allProducts && inventoryData.allProducts.length === 0 && (
            <div className="bg-white p-6 rounded-lg shadow text-center">
              <div className="text-gray-500 text-lg font-semibold">📦 No products found</div>
              <div className="text-gray-500 mt-2">Add some products to see inventory reports.</div>
            </div>
          )}
        </div>
      )}

      {/* Financial Report */}
      {activeTab === 'financial' && financialData && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm font-medium text-gray-500">Total Revenue</div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(financialData.totalRevenue)}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm font-medium text-gray-500">Total Profit</div>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(financialData.totalProfit)}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm font-medium text-gray-500">Total Tax</div>
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(financialData.totalTax)}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm font-medium text-gray-500">Average Bill Value</div>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(financialData.averageBillValue)}
              </div>
            </div>
          </div>

          {/* Period Comparison */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Period Comparison</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">
                  {formatCurrency(financialData.periodComparison.currentPeriod)}
                </div>
                <div className="text-sm text-gray-500">Current Period</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">
                  {formatCurrency(financialData.periodComparison.previousPeriod)}
                </div>
                <div className="text-sm text-gray-500">Previous Period</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-semibold ${
                  financialData.periodComparison.growthPercentage >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {financialData.periodComparison.growthPercentage >= 0 ? '+' : ''}
                  {financialData.periodComparison.growthPercentage.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-500">Growth Rate</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <div className="mt-2 text-gray-500">Loading {activeTab} report...</div>
        </div>
      )}
    </div>
  );
};

export default Reports;