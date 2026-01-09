import { useState } from 'react';
import Navbar from './components/common/Navbar';
import Dashboard from './components/dashboard/Dashboard';
import BillingScreen from './components/billing/BillingScreen';
import ReturnScreen from './components/returns/ReturnScreen';
import ProductList from './components/products/ProductList';
import BillsHistory from './components/bills/BillsHistory';
import Reports from './components/reports/Reports';
import PrinterSettings from './components/settings/PrinterSettings';
import SetupMenu from './components/settings/SetupMenu';
import { ToastProvider } from './components/common/ToastContext';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'billing':
        return <BillingScreen />;
      case 'returns':
        return <ReturnScreen />;
      case 'products':
        return <ProductList />;
      case 'bills':
        return <BillsHistory />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <PrinterSettings />;
      case 'setup':
        return <SetupMenu />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-100">
        <Navbar currentPage={currentPage} onNavigate={setCurrentPage} />
        {renderPage()}
      </div>
    </ToastProvider>
  );
}

export default App;