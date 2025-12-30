import React, { useState } from 'react';
import Navbar from './components/common/Navbar';
import Dashboard from './components/dashboard/Dashboard';
import BillingScreen from './components/billing/BillingScreen';
import ProductList from './components/products/ProductList';
import BillsHistory from './components/bills/BillsHistory';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'billing':
        return <BillingScreen />;
      case 'products':
        return <ProductList />;
      case 'bills':
        return <BillsHistory />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar currentPage={currentPage} onNavigate={setCurrentPage} />
      {renderPage()}
    </div>
  );
}

export default App;