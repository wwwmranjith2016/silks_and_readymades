import React from 'react';
import SampleReceipt from '../components/billing/SampleReceipt';

const SampleReceiptPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Sample Bill Receipt Preview
          </h1>
          <p className="text-gray-600">
            This is how your thermal printer receipt will look when printed.
            Perfect for testing without a physical printer!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Default Sample */}
          <div>
            <h2 className="text-xl font-semibold mb-4 text-center">
              Default Sample Receipt
            </h2>
            <SampleReceipt />
          </div>

          {/* Custom Sample */}
          <div>
            <h2 className="text-xl font-semibold mb-4 text-center">
              With Your Cart Items
            </h2>
            <SampleReceipt 
              billData={{
                bill_number: 'BILL-20241230-001',
                bill_date: new Date().toISOString(),
                customer_name: 'Walk-in Customer',
                customer_phone: '',
                subtotal: 275.50,
                discount_amount: 13.78,
                discount_percentage: 5,
                total_amount: 261.72,
                payment_mode: 'CASH',
                paid_amount: 261.72,
                balance_amount: 0,
                items: [
                  {
                    product_name: 'Premium Cotton T-Shirt',
                    quantity: 1,
                    unit_price: 599.00,
                    total_price: 599.00
                  },
                  {
                    product_name: 'Denim Jeans',
                    quantity: 1,
                    unit_price: 1299.00,
                    total_price: 1299.00
                  },
                  {
                    product_name: 'Sneakers',
                    quantity: 1,
                    unit_price: 899.00,
                    total_price: 899.00
                  }
                ]
              }}
              shopInfo={{
                shop_name: 'Silks & Readymades',
                owner_name: 'Fashion Store',
                address: '456 Fashion Street, Style City, SC 67890',
                phone: '+91 8765432109'
              }}
            />
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-12 bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4">How to Use Receipt Preview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">In Billing Screen:</h4>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Add items to your cart</li>
                <li>Click "👁️ Preview Receipt" button</li>
                <li>Review the formatted receipt</li>
                <li>Use "🖨️ Print Preview" to print or save as PDF</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Features:</h4>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Exact thermal printer formatting</li>
                <li>Proper text alignment and spacing</li>
                <li>All bill details included</li>
                <li>Print-ready layout</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Back to Billing Button */}
        <div className="text-center mt-8">
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            ← Back to Billing
          </button>
        </div>
      </div>
    </div>
  );
};

export default SampleReceiptPage;