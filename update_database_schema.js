#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('Database Schema Update Script');
console.log('==============================');
console.log('');
console.log('🔧 This script helps fix the "no such table: return_transactions" error');
console.log('');

// Read schema file
const schemaPath = path.join(__dirname, 'electron/database/schema.sql');
console.log('Schema path:', schemaPath);

if (!fs.existsSync(schemaPath)) {
    console.error('❌ Schema file not found at:', schemaPath);
    process.exit(1);
}

const schema = fs.readFileSync(schemaPath, 'utf8');
console.log('✅ Schema file loaded, size:', schema.length, 'characters');

console.log('');
console.log('📋 SOLUTION OPTIONS:');
console.log('');
console.log('1️⃣  AUTOMATIC FIX (Recommended):');
console.log('   - The application will now automatically detect missing return tables');
console.log('   - Simply restart the application and the tables will be created');
console.log('');
console.log('2️⃣  MANUAL UPDATE:');
console.log('   - Use the standalone script: node update_return_tables.js');
console.log('   - This will update your existing database file');
console.log('');
console.log('3️⃣  RESET DATABASE:');
console.log('   - Close the application completely');
console.log('   - Delete the existing database file (billing.db)');
console.log('   - Restart the application (a new database will be created)');
console.log('');
console.log('📝 SCHEMA DETAILS:');
console.log('The return tables that will be created include:');
console.log('- return_transactions (main return record)');
console.log('- return_items (items being returned)');
console.log('- exchange_items (replacement items)');
console.log('- Related triggers for stock management');
console.log('- Indexes for performance');
console.log('');

console.log('🛠️  Manual SQL execution (if needed):');
console.log('If you want to manually run the SQL commands, open your database');
console.log('file and run these SQL statements:');
console.log('');
console.log('--- BEGIN SCHEMA ---');
console.log(schema);
console.log('--- END SCHEMA ---');
console.log('');

console.log('✅ The database schema update process is ready.');
console.log('💡 Recommendation: Try restarting the application first for automatic fix.');
