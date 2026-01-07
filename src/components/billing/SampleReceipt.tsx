import React from 'react';
import { getShopInfo, getShopSettings } from '../../utils/shopSettings';

interface SampleReceiptProps {
  billData?: any;
  shopInfo?: any;
}

const SampleReceipt: React.FC<SampleReceiptProps> = ({ 
  billData = getDefaultBillData(), 
  shopInfo = getDefaultShopInfo() 
}) => {
  // Ensure shopInfo has all required fields
  const settings = getShopSettings();
  const info = shopInfo || {};
  const logo = info.logo || settings.logo || '';
  const includeLogo = info.include_logo !== false ? info.include_logo : settings.receiptSettings.includeLogo;
  const footerMessage = info.footer_message || settings.receiptSettings.footerMessage || 'Thank you for your business!';
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md mx-auto">
      <div className="font-mono text-sm bg-gray-50 p-4 rounded border-2 border-dashed border-gray-300">
        {/* Header */}
        <div className="text-center mb-4">
          {includeLogo && logo && (
            <div className="mb-2">
              <img 
                src={logo} 
                alt="Shop Logo" 
                className="h-16 w-auto object-contain mx-auto"
                style={{ maxWidth: '100px' }}
              />
            </div>
          )}
          <div className="font-bold text-lg">{info.shop_name || settings.shopName || 'My Shop'}</div>
          {info.address && (
            <div className="text-xs">{info.address}</div>
          )}
          {info.phone && (
            <div className="text-xs">Phone: {info.phone}</div>
          )}
        </div>

        <div className="border-t border-b border-gray-400 py-2 mb-4">
          {/* Bill details */}
          <div>Bill No: {billData.bill_number}</div>
          <div>Date: {formatDate(billData.bill_date)}</div>
          
          {billData.customer_name && (
            <div>Customer: {billData.customer_name}</div>
          )}
          {billData.customer_phone && (
            <div>Phone: {billData.customer_phone}</div>
          )}
        </div>

        {/* Items header */}
        <div className="font-bold mb-2">ITEMS</div>
        <div className="border-b border-gray-400 pb-2 mb-4"></div>

        {/* Items */}
        {billData.items.map((item: any, index: number) => (
          <div key={index} className="mb-3">
            <div>{item.product_name}</div>
            <div className="text-right">
              {item.quantity} x ₹{item.unit_price.toFixed(2)} = ₹{item.total_price.toFixed(2)}
            </div>
          </div>
        ))}

        <div className="border-t border-b border-gray-400 py-2 my-4">
          {/* Totals */}
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>₹{billData.subtotal.toFixed(2)}</span>
          </div>
          
          {billData.discount_amount > 0 && (
            <div className="flex justify-between">
              <span>Discount ({billData.discount_percentage}%):</span>
              <span>-₹{billData.discount_amount.toFixed(2)}</span>
            </div>
          )}
          
          <div className="flex justify-between font-bold text-lg border-t border-gray-400 pt-2">
            <span>TOTAL:</span>
            <span>₹{billData.total_amount.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment info */}
        <div className="mb-4">
          <div className="flex justify-between">
            <span>Payment:</span>
            <span>{billData.payment_mode}</span>
          </div>
          <div className="flex justify-between">
            <span>Paid:</span>
            <span>₹{billData.paid_amount.toFixed(2)}</span>
          </div>
          
          {billData.balance_amount > 0 && (
            <div className="flex justify-between">
              <span>Balance:</span>
              <span>₹{billData.balance_amount.toFixed(2)}</span>
            </div>
          )}
        </div>

        <div className="border-t border-b border-gray-400 py-2 mb-4"></div>

        {/* Footer */}
        <div className="text-center">
          <div>{footerMessage}</div>
          <div>Please visit again</div>
          {billData.bill_number === 'BILL-001' && (
            <div className="mt-4 text-xs text-gray-500">
              This is a sample receipt for preview purposes
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Default sample data
function getDefaultBillData() {
  return {
    bill_number: 'BILL-001',
    bill_date: new Date().toISOString(),
    customer_name: 'John Doe',
    customer_phone: '+91 9876543210',
    subtotal: 450.00,
    discount_amount: 45.00,
    discount_percentage: 10,
    total_amount: 405.00,
    payment_mode: 'UPI',
    paid_amount: 405.00,
    balance_amount: 0,
    items: [
      {
        product_name: 'Organic Rice (1kg)',
        quantity: 2,
        unit_price: 75.00,
        total_price: 150.00
      },
      {
        product_name: 'Fresh Milk (500ml)',
        quantity: 3,
        unit_price: 28.00,
        total_price: 84.00
      },
      {
        product_name: 'Brown Bread',
        quantity: 1,
        unit_price: 35.00,
        total_price: 35.00
      },
      {
        product_name: 'Tomatoes (1kg)',
        quantity: 2,
        unit_price: 40.00,
        total_price: 80.00
      },
      {
        product_name: 'Bananas (1kg)',
        quantity: 1,
        unit_price: 50.00,
        total_price: 50.00
      },
      {
        product_name: 'Cooking Oil (1L)',
        quantity: 1,
        unit_price: 120.00,
        total_price: 120.00
      }
    ]
  };
}

function getDefaultShopInfo() {
  return getShopInfo();
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-IN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default SampleReceipt;