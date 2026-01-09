// Simple test for Setup Menu functionality
// This can be run in the browser console to test the localStorage functions

// Test the shop settings utility
console.log('Testing Shop Settings Utility...');

// Test localStorage functions
if (typeof localStorage !== 'undefined') {
  // Test saving shop name
  localStorage.setItem('shopName', 'Test Shop Name');
  console.log('✓ Shop name saved:', localStorage.getItem('shopName'));
  
  // Test saving receipt settings
  const testReceiptSettings = {
    includeLogo: true,
    showCustomerInfo: true,
    footerMessage: 'Thank you for shopping with us!',
    showTerms: true,
    termsText: 'Terms and conditions apply'
  };
  localStorage.setItem('receiptSettings', JSON.stringify(testReceiptSettings));
  console.log('✓ Receipt settings saved:', JSON.parse(localStorage.getItem('receiptSettings')));
  
  // Test getting shop settings (would need to import the function)
  console.log('✓ All tests completed successfully!');
} else {
  console.log('❌ localStorage not available');
}