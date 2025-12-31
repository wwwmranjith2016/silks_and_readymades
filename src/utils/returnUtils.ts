import { ReturnItem, ExchangeItem, ReturnSummary } from '../types/returnTypes';

// Calculate return summary
export const calculateReturnSummary = (
  returnItems: ReturnItem[],
  exchangeItems: ExchangeItem[]
): ReturnSummary => {
  const totalReturnValue = returnItems.reduce((sum, item) => sum + item.total_price, 0);
  const totalExchangeValue = exchangeItems.reduce((sum, item) => sum + item.total_price, 0);
  const balanceAmount = totalExchangeValue - totalReturnValue;
  
  return {
    total_return_value: totalReturnValue,
    total_exchange_value: totalExchangeValue,
    balance_amount: balanceAmount,
    is_balance_positive: balanceAmount > 0
  };
};

// Format currency for display
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount);
};

// Format date for display
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Validate return data
export const validateReturnData = (
  originalBillId: number,
  returnItems: ReturnItem[],
  exchangeItems: ExchangeItem[]
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!originalBillId || originalBillId <= 0) {
    errors.push('Valid original bill ID is required');
  }
  
  if (returnItems.length === 0) {
    errors.push('At least one item must be selected for return');
  }
  
  if (exchangeItems.length === 0) {
    errors.push('At least one item must be selected for exchange');
  }
  
  // Validate return items
  returnItems.forEach((item, index) => {
    if (!item.product_name || item.product_name.trim() === '') {
      errors.push(`Return item ${index + 1}: Product name is required`);
    }
    if (item.quantity <= 0) {
      errors.push(`Return item ${index + 1}: Quantity must be greater than 0`);
    }
    if (item.unit_price < 0) {
      errors.push(`Return item ${index + 1}: Unit price cannot be negative`);
    }
  });
  
  // Validate exchange items
  exchangeItems.forEach((item, index) => {
    if (!item.product_name || item.product_name.trim() === '') {
      errors.push(`Exchange item ${index + 1}: Product name is required`);
    }
    if (item.quantity <= 0) {
      errors.push(`Exchange item ${index + 1}: Quantity must be greater than 0`);
    }
    if (item.unit_price < 0) {
      errors.push(`Exchange item ${index + 1}: Unit price cannot be negative`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Create return receipt data
export const createReturnReceiptData = (
  returnTransaction: any,
  originalBill: any,
  returnItems: ReturnItem[],
  exchangeItems: ExchangeItem[],
  summary: ReturnSummary,
  shopInfo: any
) => {
  return {
    return_number: `RET-${returnTransaction.return_id.toString().padStart(6, '0')}`,
    return_date: new Date().toISOString(),
    original_bill_number: originalBill?.bill_number || 'N/A',
    original_bill_date: originalBill?.bill_date || 'N/A',
    customer_name: returnTransaction.customer_name || 'Walk-in Customer',
    customer_phone: returnTransaction.customer_phone || '',
    return_reason: returnTransaction.return_reason || '',
    notes: returnTransaction.notes || '',
    
    return_items: returnItems.map(item => ({
      product_name: item.product_name,
      product_code: item.product_code,
      barcode: item.barcode,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price
    })),
    
    exchange_items: exchangeItems.map(item => ({
      product_name: item.product_name,
      product_code: item.product_code,
      barcode: item.barcode,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price
    })),
    
    summary: {
      total_return_value: summary.total_return_value,
      total_exchange_value: summary.total_exchange_value,
      balance_amount: summary.balance_amount,
      balance_type: summary.is_balance_positive ? 'Customer Pays' : 'Customer Gets Change'
    },
    
    shop_info: shopInfo
  };
};

// Search bills by various criteria
export const searchBills = (bills: any[], searchQuery: string): any[] => {
  if (!searchQuery.trim()) {
    return bills;
  }
  
  const query = searchQuery.toLowerCase().trim();
  return bills.filter(bill => {
    const searchableFields = [
      bill.bill_number?.toString() || '',
      bill.customer_name?.toLowerCase() || '',
      bill.customer_phone?.toString() || '',
      bill.total_amount?.toString() || '',
      new Date(bill.bill_date).toLocaleDateString().toLowerCase() || '',
      new Date(bill.bill_date).toLocaleString().toLowerCase() || ''
    ];
    return searchableFields.some(field => field.includes(query));
  });
};

// Filter bills that are eligible for return (not already returns)
export const getEligibleBillsForReturn = (bills: any[]): any[] => {
  return bills.filter(bill => !bill.is_return);
};

// Get return status badge color
export const getReturnStatusBadgeColor = (status: string): string => {
  switch (status?.toUpperCase()) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'COMPLETED':
      return 'bg-green-100 text-green-800';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Calculate item totals
export const calculateItemTotals = (quantity: number, unitPrice: number): number => {
  return quantity * unitPrice;
};

// Validate stock availability for exchange items
export const validateStockAvailability = async (exchangeItems: ExchangeItem[]): Promise<{
  isValid: boolean;
  insufficientStock: Array<{ product_name: string; requested: number; available: number }>;
}> => {
  const insufficientStock: Array<{ product_name: string; requested: number; available: number }> = [];
  
  for (const item of exchangeItems) {
    if (item.product_id) {
      try {
        const result = await (window as any).electron.products.getById(item.product_id);
        if (result.success) {
          const product = result.data;
          if (product.stock_quantity < item.quantity) {
            insufficientStock.push({
              product_name: item.product_name,
              requested: item.quantity,
              available: product.stock_quantity
            });
          }
        }
      } catch (error) {
        console.error('Error checking stock for product:', item.product_name, error);
      }
    }
  }
  
  return {
    isValid: insufficientStock.length === 0,
    insufficientStock
  };
};

// Generate unique return ID
export const generateReturnId = (): string => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `RET-${timestamp.slice(-6)}${random}`;
};

// Debug function to log return transaction details
export const debugReturnTransaction = (returnData: any): void => {
  console.log('=== RETURN TRANSACTION DEBUG ===');
  console.log('Original Bill ID:', returnData.original_bill_id);
  console.log('Customer:', returnData.customer_name, returnData.customer_phone);
  
  console.log('\n--- RETURN ITEMS ---');
  returnData.return_items.forEach((item: any, index: number) => {
    console.log(`${index + 1}. ${item.product_name}`);
    console.log(`   Product ID: ${item.product_id}`);
    console.log(`   Quantity: ${item.quantity}`);
    console.log(`   Unit Price: ₹${item.unit_price}`);
    console.log(`   Total Price: ₹${item.total_price}`);
    console.log(`   Barcode: ${item.barcode}`);
  });
  
  console.log('\n--- EXCHANGE ITEMS ---');
  returnData.exchange_items.forEach((item: any, index: number) => {
    console.log(`${index + 1}. ${item.product_name}`);
    console.log(`   Product ID: ${item.product_id}`);
    console.log(`   Quantity: ${item.quantity}`);
    console.log(`   Unit Price: ₹${item.unit_price}`);
    console.log(`   Total Price: ₹${item.total_price}`);
    console.log(`   Barcode: ${item.barcode}`);
  });
  
  const totalReturnValue = returnData.return_items.reduce((sum: number, item: any) => sum + item.total_price, 0);
  const totalExchangeValue = returnData.exchange_items.reduce((sum: number, item: any) => sum + item.total_price, 0);
  const balanceAmount = totalExchangeValue - totalReturnValue;
  
  console.log('\n--- FINANCIAL SUMMARY ---');
  console.log(`Total Return Value: ₹${totalReturnValue}`);
  console.log(`Total Exchange Value: ₹${totalExchangeValue}`);
  console.log(`Balance Amount: ₹${balanceAmount}`);
  console.log(`Balance Type: ${balanceAmount > 0 ? 'Customer Pays' : 'Customer Gets Change'}`);
  
  console.log('=== END DEBUG ===\n');
};

// Validate return data with detailed logging
export const validateReturnDataWithLogging = (
  originalBillId: number,
  returnItems: ReturnItem[],
  exchangeItems: ExchangeItem[]
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  console.log('=== VALIDATION DEBUG ===');
  console.log('Original Bill ID:', originalBillId);
  console.log('Return Items Count:', returnItems.length);
  console.log('Exchange Items Count:', exchangeItems.length);
  
  if (!originalBillId || originalBillId <= 0) {
    errors.push('Valid original bill ID is required');
  }
  
  if (returnItems.length === 0) {
    errors.push('At least one item must be selected for return');
  }
  
  if (exchangeItems.length === 0) {
    errors.push('At least one item must be selected for exchange');
  }
  
  // Validate return items
  returnItems.forEach((item, index) => {
    console.log(`Validating return item ${index + 1}:`, item);
    if (!item.product_name || item.product_name.trim() === '') {
      errors.push(`Return item ${index + 1}: Product name is required`);
    }
    if (item.quantity <= 0) {
      errors.push(`Return item ${index + 1}: Quantity must be greater than 0`);
    }
    if (item.unit_price < 0) {
      errors.push(`Return item ${index + 1}: Unit price cannot be negative`);
    }
    const calculatedTotal = item.quantity * item.unit_price;
    if (Math.abs(calculatedTotal - item.total_price) > 0.01) {
      errors.push(`Return item ${index + 1}: Total price mismatch (calculated: ${calculatedTotal}, provided: ${item.total_price})`);
    }
  });
  
  // Validate exchange items
  exchangeItems.forEach((item, index) => {
    console.log(`Validating exchange item ${index + 1}:`, item);
    if (!item.product_name || item.product_name.trim() === '') {
      errors.push(`Exchange item ${index + 1}: Product name is required`);
    }
    if (item.quantity <= 0) {
      errors.push(`Exchange item ${index + 1}: Quantity must be greater than 0`);
    }
    if (item.unit_price < 0) {
      errors.push(`Exchange item ${index + 1}: Unit price cannot be negative`);
    }
    const calculatedTotal = item.quantity * item.unit_price;
    if (Math.abs(calculatedTotal - item.total_price) > 0.01) {
      errors.push(`Exchange item ${index + 1}: Total price mismatch (calculated: ${calculatedTotal}, provided: ${item.total_price})`);
    }
  });
  
  console.log('Validation errors:', errors);
  console.log('=== END VALIDATION DEBUG ===\n');
  
  return {
    isValid: errors.length === 0,
    errors
  };
};