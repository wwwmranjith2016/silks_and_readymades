import React, { useState, useEffect } from 'react';
import { useToast } from '../common/ToastContext';

interface BillEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  bill: any;
}

const BillEditModal: React.FC<BillEditModalProps> = ({ isOpen, onClose, onSuccess, bill }) => {
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    payment_method: '',
    comment: '',
    paid_amount: ''
  });
  const [showPaidConfirm, setShowPaidConfirm] = useState(false);
  const [originalPaidAmount, setOriginalPaidAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (bill) {
      setFormData({
        customer_name: bill.customer_name || '',
        customer_phone: bill.customer_phone || '',
        payment_method: bill.payment_method || '',
        comment: bill.comment || '',
        paid_amount: bill.paid_amount?.toString() || ''
      });
      setOriginalPaidAmount(bill.paid_amount?.toString() || '');
    }
  }, [bill]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customer_name.trim()) {
      showToast('Customer name is required', 'warning');
      return;
    }

    setLoading(true);

    try {
      const result = await (window as any).electron.bills.update(bill.bill_id, {
        customer_name: formData.customer_name.trim(),
        customer_phone: formData.customer_phone.trim(),
        payment_method: formData.payment_method,
        comment: formData.comment.trim(),
        paid_amount: parseFloat(formData.paid_amount.toString()) || 0
      });

      if (result.success) {
        showToast('Bill updated successfully', 'success');
        onSuccess();
        onClose();
      } else {
        showToast('Error updating bill: ' + result.error, 'error');
      }
    } catch (error) {
      showToast('Error updating bill: ' + error, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !bill) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Edit Bill</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Bill Info - Fixed */}
        <div className="flex-shrink-0 p-6 border-b">
          <div className="p-3 bg-gray-50 rounded">
            <p className="text-sm text-gray-600">
              <strong>Bill:</strong> #{bill.bill_number}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Date:</strong> {new Date(bill.bill_date).toLocaleDateString()}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Amount:</strong> ₹{bill.total_amount}
            </p>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Customer Name */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter customer name"
                required
              />
            </div>

            {/* Customer Phone */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Customer Phone
              </label>
              <input
                type="tel"
                value={formData.customer_phone}
                onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter customer phone number"
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Payment Method
              </label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="UPI">UPI</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CREDIT">Credit</option>
              </select>
            </div>

            {/* Paid Amount */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Paid Amount
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.paid_amount?.toString() || '0'}
                onChange={(e) => setFormData({ ...formData, paid_amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter amount paid"
              />
            </div>

            {/* Comment/Notes */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Comment/Notes
              </label>
              <textarea
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add any additional notes..."
              />
            </div>

            {/* Info Message */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> Only basic bill information can be edited. 
                To modify items or quantities, please create a new bill.
              </p>
            </div>
          </form>
        </div>

        {/* Footer with Buttons - Fixed */}
        <div className="flex-shrink-0 p-6 border-t bg-gray-50">
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              onClick={handleSubmit}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
            >
              {loading ? 'Updating...' : 'Update Bill'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillEditModal;