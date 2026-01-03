import React from 'react';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'billing', label: 'New Bill', icon: '🧾' },
    { id: 'returns', label: 'Returns', icon: '🔄' },
    { id: 'products', label: 'Products', icon: '📦' },
    { id: 'bills', label: 'Bills History', icon: '📋' },
    { id: 'reports', label: 'Reports', icon: '📈' },
    { id: 'settings', label: 'Printer Settings', icon: '🖨️' },
    { id: 'setup', label: 'Setup', icon: '⚙️' },
  ];

  return (
    <nav className="bg-blue-600 text-white">
      <div className="flex">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`px-6 py-4 font-semibold hover:bg-blue-700 transition-colors ${
                currentPage === item.id ? 'bg-blue-800' : ''
              }`}
            >
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </button>
          ))}
      </div>
    </nav>
  );
};

export default Navbar;