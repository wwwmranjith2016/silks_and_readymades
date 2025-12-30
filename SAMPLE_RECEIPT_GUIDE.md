# Sample Receipt Feature Guide

## Overview

Since you don't have a physical thermal printer, I've created a **Sample Receipt** feature that allows you to preview exactly how your bills will look when printed. This is perfect for testing, demonstration, and ensuring your receipts are formatted correctly.

## Features Added

### 1. Sample Receipt Component (`src/components/billing/SampleReceipt.tsx`)
- **Exact thermal printer formatting**: Replica of thermal receipt layout
- **All bill details**: Includes shop info, items, totals, payment details
- **Customizable data**: Can display default samples or your actual cart items
- **Print-ready format**: Optimized for printing or PDF export

### 2. Billing Screen Integration (`src/components/billing/BillingScreen.tsx`)
- **Preview Button**: "👁️ Preview Receipt" button in the billing interface
- **Live Preview**: Shows exactly what will be printed based on current cart
- **Modal Display**: Clean popup modal for receipt preview
- **Print Function**: Built-in print functionality for the preview

### 3. Standalone Sample Page (`src/pages/SampleReceiptPage.tsx`)
- **Multiple Examples**: Default samples and custom examples
- **Direct Access**: Available from main navigation menu
- **Usage Instructions**: Built-in guide on how to use the feature
- **Comparison View**: See different receipt formats side by side

## How to Use

### Option 1: From Billing Screen
1. Add items to your cart
2. Click the **"👁️ Preview Receipt"** button
3. Review the formatted receipt in the popup modal
4. Click **"🖨️ Print Preview"** to print or save as PDF
5. Click **"Close"** to return to billing

### Option 2: Standalone Sample Page
1. Click **"Sample Receipt"** in the main navigation menu
2. View different sample receipts
3. Use browser's print function to print or save as PDF
4. Return to other pages using the back button

## Receipt Format

The sample receipts include all standard thermal printer elements:

```
========================================
         Silks & Readymades
           Retail Store
      123 Main Street, City, State 12345
          Phone: +91 9876543210
========================================
Bill No: BILL-001
Date: 30/12/2025, 12:10
Customer: John Doe
Phone: +91 9876543210
========================================
ITEMS
========================================
Organic Rice (1kg)
      2 x ₹75.00 = ₹150.00
Fresh Milk (500ml)
      3 x ₹28.00 = ₹84.00
...
========================================
Subtotal:        ₹450.00
Discount (10%):   -₹45.00
TOTAL:            ₹405.00
========================================
Payment:          UPI
Paid:             ₹405.00
========================================
     Thank you for your business!
        Please visit again

    This is a sample receipt for preview purposes
```

## Benefits

✅ **No Printer Required**: Test receipts without physical hardware
✅ **Exact Formatting**: Matches thermal printer output precisely  
✅ **Print Ready**: Can be printed or saved as PDF
✅ **Live Preview**: See current cart items formatted
✅ **Multiple Examples**: Different sample scenarios
✅ **Easy Access**: Integrated into existing workflow

## Technical Details

- **Responsive Design**: Works on desktop and mobile
- **Print Optimization**: Formatted specifically for thermal printer dimensions
- **Font**: Uses monospace font for authentic receipt appearance
- **Styling**: Mimics actual thermal receipt borders and spacing
- **Real-time Updates**: Reflects current cart state when previewing

## Navigation

The new **"Sample Receipt"** menu item has been added to the main navigation bar, making it easy to access the standalone sample page at any time.

---

**Perfect for testing and demonstration when you don't have a physical thermal printer!**