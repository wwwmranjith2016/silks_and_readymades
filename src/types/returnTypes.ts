// Return Transaction Types

export interface ReturnTransaction {
  return_id: number;
  original_bill_id: number;
  customer_name?: string;
  customer_phone?: string;
  return_date: string;
  return_reason?: string;
  total_return_value: number;
  total_exchange_value: number;
  balance_amount: number;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  created_at: string;
}

export interface ReturnItem {
  return_item_id: number;
  return_id: number;
  product_id?: number;
  product_name: string;
  product_code?: string;
  barcode?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface ExchangeItem {
  exchange_item_id: number;
  return_id: number;
  product_id?: number;
  product_name: string;
  product_code?: string;
  barcode?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface ReturnWithItems extends ReturnTransaction {
  return_items: ReturnItem[];
  exchange_items: ExchangeItem[];
}

export interface ReturnProcessData {
  original_bill_id: number;
  customer_name?: string;
  customer_phone?: string;
  return_reason?: string;
  notes?: string;
  return_items: Omit<ReturnItem, 'return_item_id' | 'return_id'>[];
  exchange_items: Omit<ExchangeItem, 'exchange_item_id' | 'return_id'>[];
}

export interface BillSearchResult {
  bill_id: number;
  bill_number: string;
  customer_name?: string;
  customer_phone?: string;
  bill_date: string;
  total_amount: number;
  items: BillItem[];
  is_return: number;
  original_bill_id?: number;
}

export interface BillItem {
  item_id: number;
  bill_id: number;
  product_id?: number;
  product_name: string;
  product_code?: string;
  barcode?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface ReturnSummary {
  total_return_value: number;
  total_exchange_value: number;
  balance_amount: number;
  is_balance_positive: boolean; // true if customer needs to pay, false if customer gets change
}

export interface ReturnFilters {
  search_query?: string;
  date_from?: string;
  date_to?: string;
  status?: string;
  customer_name?: string;
}

export interface ReturnStats {
  total_returns: number;
  total_return_value: number;
  total_exchange_value: number;
  pending_returns: number;
  completed_returns: number;
}