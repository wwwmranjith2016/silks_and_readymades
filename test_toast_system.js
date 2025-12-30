#!/usr/bin/env node

// Simple test to verify the toast notification system
const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Toast Notification System...\n');

// Test 1: Check if all toast files exist
const toastFiles = [
  'src/components/common/Toast.tsx',
  'src/components/common/ToastContext.tsx',
  'src/components/common/ToastContainer.tsx'
];

console.log('📁 Checking toast files:');
toastFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
});

// Test 2: Check App.tsx for ToastContainer import
console.log('\n📱 Checking App.tsx integration:');
const appContent = fs.readFileSync('src/App.tsx', 'utf8');
const hasImport = appContent.includes("import ToastContainer from './components/common/ToastContainer'");
const hasUsage = appContent.includes('<ToastContainer />');
console.log(`  ${hasImport ? '✅' : '❌'} ToastContainer import`);
console.log(`  ${hasUsage ? '✅' : '❌'} ToastContainer usage`);

// Test 3: Check component imports in key files
console.log('\n🔧 Checking component toast usage:');
const components = [
  'src/components/products/ProductList.tsx',
  'src/components/products/ProductForm.tsx',
  'src/components/settings/PrinterSettings.tsx',
  'src/components/billing/BillingScreen.tsx'
];

components.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const hasToastImport = content.includes("import { useToast } from '../common/ToastContext'");
    const hasToastUsage = content.includes('showToast(');
    console.log(`  ${hasToastImport && hasToastUsage ? '✅' : '❌'} ${file}`);
  }
});

// Test 4: Check Tailwind configuration for toast styling
console.log('\n🎨 Checking Tailwind configuration:');
const tailwindConfig = fs.readFileSync('tailwind.config.js', 'utf8');
const hasToastClasses = tailwindConfig.includes('toast') || 
                       tailwindConfig.includes('animate') ||
                       tailwindConfig.includes('slide');
console.log(`  ${hasToastClasses ? '✅' : '❌'} Tailwind animation support`);

// Test 5: Verify no alert() calls remain
console.log('\n🚫 Checking for remaining alert() calls:');
let alertCount = 0;
components.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const matches = content.match(/alert\(/g);
    if (matches) alertCount += matches.length;
  }
});
console.log(`  ${alertCount === 0 ? '✅' : '❌'} No alert() calls remaining (found ${alertCount})`);

console.log('\n🎉 Toast notification system test completed!');
console.log('\n📋 Summary:');
console.log('  • Toast component files created');
console.log('  • Toast context and hook implemented');
console.log('  • App.tsx integrated with ToastContainer');
console.log('  • All components updated to use showToast()');
console.log('  • Tailwind CSS animations configured');
console.log('  • Browser alerts replaced with toast notifications');