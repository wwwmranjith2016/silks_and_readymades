import React from 'react';

interface ReturnReceiptProps {
  returnData: {
    return_number: string;
    return_date: string;
    original_bill_number: string;
    original_bill_date: string;
    customer_name: string;
    customer_phone: string;
    return_reason: string;
    notes: string;
    return_items: Array<{
      product_name: string;
      product_code?: string;
      barcode?: string;
      quantity: number;
      unit_price: number;
      total_price: number;
    }>;
    exchange_items: Array<{
      product_name: string;
      product_code?: string;
      barcode?: string;
      quantity: number;
      unit_price: number;
      total_price: number;
    }>;
    summary: {
      total_return_value: number;
      total_exchange_value: number;
      balance_amount: number;
      balance_type: string;
    };
    shop_info: {
      shop_name: string;
      owner_name: string;
      address: string;
      phone: string;
    };
  };
}

const ReturnReceipt: React.FC<ReturnReceiptProps> = ({ returnData }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
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

  return (
    <div className="bg-white p-6 max-w-md mx-auto font-mono text-sm">
      {/* Shop Header */}
      <div className="text-center border-b-2 border-dashed border-gray-400 pb-4 mb-4">
        <h1 className="text-lg font-bold">{returnData.shop_info.shop_name}</h1>
        <p className="text-xs">{returnData.shop_info.owner_name}</p>
        <p className="text-xs">{returnData.shop_info.address}</p>
        <p className="text-xs">Phone: {returnData.shop_info.phone}</p>
      </div>

      {/* Return Header */}
      <div className="text-center border-b border-dashed border-gray-400 pb-3 mb-4">
        <h2 className="text-base font-bold">RETURN RECEIPT</h2>
        <p className="text-xs">Return No: {returnData.return_number}</p>
        <p className="text-xs">Date: {formatDate(returnData.return_date)}</p>
      </div>

      {/* Original Bill Info */}
      <div className="mb-4">
        <div className="flex justify-between text-xs">
          <span>Original Bill:</span>
          <span className="font-semibold">{returnData.original_bill_number}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>Bill Date:</span>
          <span>{formatDate(returnData.original_bill_date)}</span>
        </div>
      </div>

      {/* Customer Info */}
      <div className="mb-4 border-b border-dashed border-gray-400 pb-3">
        <div className="text-xs">
          <div className="font-semibold">Customer:</div>
          <div>{returnData.customer_name}</div>
          {returnData.customer_phone && <div>Phone: {returnData.customer_phone}</div>}
        </div>
      </div>

      {/* Return Items */}
      <div className="mb-4">
        <h3 className="text-xs font-bold mb-2">ITEMS BEING RETURNED:</h3>
        <div className="space-y-1">
          {returnData.return_items.map((item, index) => (
            <div key={index} className="border-b border-dotted border-gray-300 pb-1 mb-1">
              <div className="text-xs">
                <div className="font-semibold">{item.product_name}</div>
                <div className="flex justify-between">
                  <span>Qty: {item.quantity} x {formatCurrency(item.unit_price)}</span>
                  <span className="font-semibold">{formatCurrency(item.total_price)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Exchange Items */}
      <div className="mb-4 border-b border-dashed border-gray-400 pb-3">
        <h3 className="text-xs font-bold mb-2">EXCHANGE ITEMS:</h3>
        <div className="space-y-1">
          {returnData.exchange_items.map((item, index) => (
            <div key={index} className="border-b border-dotted border-gray-300 pb-1 mb-1">
              <div className="text-xs">
                <div className="font-semibold">{item.product_name}</div>
                <div className="flex justify-between">
                  <span>Qty: {item.quantity} x {formatCurrency(item.unit_price)}</span>
                  <span className="font-semibold">{formatCurrency(item.total_price)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="mb-4">
        <div className="flex justify-between text-xs">
          <span>Total Return Value:</span>
          <span className="font-semibold text-green-600">{formatCurrency(returnData.summary.total_return_value)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>Total Exchange Value:</span>
          <span className="font-semibold text-blue-600">{formatCurrency(returnData.summary.total_exchange_value)}</span>
        </div>
        <div className="flex justify-between text-xs border-t border-dashed border-gray-400 pt-1 mt-1">
          <span className="font-semibold">{returnData.summary.balance_type}:</span>
          <span className={`font-bold ${
            returnData.summary.balance_amount > 0 ? 'text-orange-600' : 'text-purple-600'
          }`}>
            {returnData.summary.balance_amount > 0 ? '+' : ''}
            {formatCurrency(Math.abs(returnData.summary.balance_amount))}
          </span>
        </div>
      </div>

      {/* Return Reason & Notes */}
      {(returnData.return_reason || returnData.notes) && (
        <div className="mb-4 border-b border-dashed border-gray-400 pb-3">
          {returnData.return_reason && (
            <div className="text-xs mb-2">
              <span className="font-semibold">Reason: </span>
              <span>{returnData.return_reason}</span>
            </div>
          )}
          {returnData.notes && (
            <div className="text-xs">
              <span className="font-semibold">Notes: </span>
              <span>{returnData.notes}</span>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs border-t border-dashed border-gray-400 pt-3">
        <p>Thank you for your business!</p>
        <p>Return processed on: {formatDate(returnData.return_date)}</p>
      </div>
    </div>
  );
};

export default ReturnReceipt;