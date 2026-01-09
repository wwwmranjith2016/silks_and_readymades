import React, { useState, useEffect } from 'react';
import { useToast } from '../common/ToastContext';
import { getShopInfo } from '../../utils/shopSettings';

const PrinterSettings: React.FC = () => {
  const [availablePrinters, setAvailablePrinters] = useState<any[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [printerStatus, setPrinterStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadAvailablePrinters();
    loadPrinterStatus();
  }, []);

  const loadAvailablePrinters = async () => {
    try {
      const result = await (window as any).electron.printer.getAvailable();
      if (result.success) {
        setAvailablePrinters(result.printers || []);
        
        // Load saved printer selection
        const savedPrinter = localStorage.getItem('thermalPrinterName');
        if (savedPrinter && result.printers.some((p: any) => p.name === savedPrinter)) {
          setSelectedPrinter(savedPrinter);
        }
      }
    } catch (error) {
      console.error('Error loading printers:', error);
    }
  };

  const loadPrinterStatus = async () => {
    try {
      const result = await (window as any).electron.printer.getStatus();
      if (result.success) {
        setPrinterStatus(result.data);
      }
    } catch (error) {
      console.error('Error loading printer status:', error);
    }
  };

  const handlePrinterSelect = async (printerName: string) => {
    setSelectedPrinter(printerName);
    setLoading(true);

    try {
      const result = await (window as any).electron.printer.initialize(printerName);
      if (result.success) {
        localStorage.setItem('thermalPrinterName', printerName);
        showToast('Printer connected successfully!', 'success');
        loadPrinterStatus();
      } else {
        showToast('Failed to connect to printer: ' + result.error, 'error');
        setSelectedPrinter('');
      }
    } catch (error) {
      showToast('Error connecting to printer: ' + error, 'error');
      setSelectedPrinter('');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!selectedPrinter) {
      showToast('Please select a printer first', 'warning');
      return;
    }

    setTesting(true);
    try {
      const result = await (window as any).electron.printer.testConnection();
      if (result.success) {
        showToast('Printer connection test successful!', 'success');
      } else {
        showToast('Printer connection test failed: ' + result.error, 'error');
      }
    } catch (error) {
      showToast('Error testing printer connection: ' + error, 'error');
    } finally {
      setTesting(false);
    }
  };

  const printTestPage = async () => {
    if (!selectedPrinter) {
      showToast('Please select a printer first', 'warning');
      return;
    }

    // Create test bill data
    const testBillData = {
      bill_number: 'TEST-001',
      bill_date: new Date().toISOString(),
      customer_name: 'Test Customer',
      customer_phone: '1234567890',
      subtotal: 100.00,
      discount_amount: 0,
      discount_percentage: 0,
      total_amount: 100.00,
      payment_mode: 'CASH',
      paid_amount: 100.00,
      balance_amount: 0,
      items: [
        {
          product_name: 'Test Product 1',
          quantity: 1,
          unit_price: 50.00,
          total_price: 50.00
        },
        {
          product_name: 'Test Product 2',
          quantity: 1,
          unit_price: 50.00,
          total_price: 50.00
        }
      ]
    };

    try {
      const shopInfo = getShopInfo();
      const result = await (window as any).electron.printer.printBill(testBillData, shopInfo);
      if (result.success) {
        showToast('Test page printed successfully!', 'success');
      } else {
        showToast('Failed to print test page: ' + result.error, 'error');
      }
    } catch (error) {
      showToast('Error printing test page: ' + error, 'error');
    }
  };

  const getStatusColor = (status: any) => {
    if (!status) return 'text-gray-500';
    return status.connected ? 'text-green-600' : 'text-red-600';
  };

  const getStatusText = (status: any) => {
    if (!status) return 'Unknown';
    return status.connected ? 'Connected' : 'Disconnected';
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-gray-800">Thermal Printer Settings</h1>
          <p className="text-gray-600 mt-2">Configure your thermal printer for bill printing</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Printer Status */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-3">Current Status</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-600">Connection:</span>
                <div className={`font-semibold ${getStatusColor(printerStatus)}`}>
                  {getStatusText(printerStatus)}
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Selected Printer:</span>
                <div className="font-semibold">
                  {selectedPrinter || 'None Selected'}
                </div>
              </div>
            </div>
          </div>

          {/* Available Printers */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Available Printers</h2>
            {availablePrinters.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">🖨️</div>
                <div>No thermal printers found</div>
                <div className="text-sm mt-1">Make sure your printer is connected and turned on</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availablePrinters.map((printer, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedPrinter === printer.name
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handlePrinterSelect(printer.name)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{printer.name}</div>
                        <div className="text-sm text-gray-600">Type: {printer.type}</div>
                      </div>
                      {selectedPrinter === printer.name && (
                        <div className="text-blue-600">
                          ✓
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          {selectedPrinter && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3">Printer Actions</h3>
              <div className="flex gap-3">
                <button
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
                >
                  {testing ? 'Testing...' : 'Test Connection'}
                </button>
                <button
                  onClick={printTestPage}
                  disabled={loading}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
                >
                  Print Test Page
                </button>
                <button
                  onClick={loadPrinterStatus}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Refresh Status
                </button>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2 text-yellow-800">Setup Instructions</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Connect your thermal printer to the computer</li>
              <li>• Install the printer drivers if required</li>
              <li>• Make sure the printer is set as default or shared</li>
              <li>• Select your printer from the list above</li>
              <li>• Test the connection before printing bills</li>
            </ul>
          </div>

          {/* Troubleshooting */}
          <div className="bg-red-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2 text-red-800">Troubleshooting</h3>
            <ul className="text-sm text-red-700 space-y-1">
              <li>• If no printers appear, check printer connections and drivers</li>
              <li>• On Windows, ensure printers are set as "Local" in printer properties</li>
              <li>• On Mac/Linux, ensure printers are configured in CUPS</li>
              <li>• Some printers may require administrator privileges</li>
              <li>• Restart the application after changing printer settings</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrinterSettings;