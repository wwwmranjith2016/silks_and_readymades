const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class DatabaseManager {
  constructor() {
    this.db = null;
    this.SQL = null;
  }

  async initialize() {
    try {
      // Initialize SQL.js
      this.SQL = await initSqlJs();
      
      // Database path
      const userDataPath = app.getPath('userData');
      const dbPath = path.join(userDataPath, 'billing.db');
      
      console.log('Database path:', dbPath);
      
      // Check if database file exists
      if (fs.existsSync(dbPath)) {
        // Load existing database
        const buffer = fs.readFileSync(dbPath);
        this.db = new this.SQL.Database(buffer);
        console.log('Existing database loaded');
      } else {
        // Create new database
        this.db = new this.SQL.Database();
        this.runMigrations();
        this.saveDatabase(dbPath);
        console.log('New database created');
      }
      
      return { success: true, path: dbPath };
    } catch (error) {
      console.error('Database initialization error:', error);
      return { success: false, error: error.message };
    }
  }

  runMigrations() {
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema
    this.db.run(schema);
    console.log('Database schema created');
  }

  saveDatabase(dbPath) {
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbPath, buffer);
    } catch (error) {
      console.error('Error saving database:', error);
    }
  }

  getDatabase() {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  // Helper method to run queries
  run(sql, params = []) {
    return this.db.run(sql, params);
  }

  // Helper method to get single row
  get(sql, params = []) {
    const result = this.db.exec(sql, params);
    if (result.length > 0 && result[0].values.length > 0) {
      const columns = result[0].columns;
      const values = result[0].values[0];
      const row = {};
      columns.forEach((col, index) => {
        row[col] = values[index];
      });
      return row;
    }
    return null;
  }

  // Helper method to get all rows
  all(sql, params = []) {
    const result = this.db.exec(sql, params);
    if (result.length > 0) {
      const columns = result[0].columns;
      return result[0].values.map(values => {
        const row = {};
        columns.forEach((col, index) => {
          row[col] = values[index];
        });
        return row;
      });
    }
    return [];
  }

  close() {
    if (this.db) {
      // Save before closing
      const userDataPath = app.getPath('userData');
      const dbPath = path.join(userDataPath, 'billing.db');
      this.saveDatabase(dbPath);
      this.db.close();
    }
  }
}

module.exports = DatabaseManager;