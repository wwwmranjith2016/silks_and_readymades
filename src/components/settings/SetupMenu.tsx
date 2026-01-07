import React, { useState, useEffect } from 'react';
import { useToast } from '../common/ToastContext';
import SampleReceipt from '../billing/SampleReceipt';

// interface ShopInfo {
//   shopName: string;
//   address: string;
//   phone: string;
// }

interface ReceiptSettings {
  includeLogo: boolean;
  showCustomerInfo: boolean;
  footerMessage: string;
  showTerms: boolean;
  termsText: string;
}

const SetupMenu: React.FC = () => {
  const [shopName, setShopName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [logo, setLogo] = useState('');
  const [receiptSettings, setReceiptSettings] = useState<ReceiptSettings>({
    includeLogo: true,
    showCustomerInfo: true,
    footerMessage: 'Thank you for your business!',
    showTerms: false,
    termsText: ''
  });
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    // Load shop name
    const savedShopName = localStorage.getItem('shopName') || '';
    setShopName(savedShopName);

    // Load address
    const savedAddress = localStorage.getItem('shopAddress') || '';
    setAddress(savedAddress);

    // Load phone
    const savedPhone = localStorage.getItem('shopPhone') || '';
    setPhone(savedPhone);

    // Load logo
    const savedLogo = localStorage.getItem('shopLogo') || '';
    setLogo(savedLogo);

    // Load receipt settings
    const savedReceiptSettings = localStorage.getItem('receiptSettings');
    if (savedReceiptSettings) {
      try {
        setReceiptSettings(JSON.parse(savedReceiptSettings));
      } catch (error) {
        console.error('Error parsing receipt settings:', error);
      }
    }
  };

  const saveShopInfo = async () => {
    if (!shopName.trim()) {
      showToast('Please enter a shop name', 'warning');
      return;
    }

    setLoading(true);
    try {
      localStorage.setItem('shopName', shopName.trim());
      localStorage.setItem('shopAddress', address.trim());
      localStorage.setItem('shopPhone', phone.trim());
      localStorage.setItem('shopLogo', logo.trim());
      showToast('Shop information saved successfully!', 'success');
    } catch (error) {
      showToast('Error saving shop information: ' + error, 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveReceiptSettings = async () => {
    setLoading(true);
    try {
      localStorage.setItem('receiptSettings', JSON.stringify(receiptSettings));
      showToast('Receipt settings saved successfully!', 'success');
    } catch (error) {
      showToast('Error saving receipt settings: ' + error, 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateReceiptSetting = (key: keyof ReceiptSettings, value: any) => {
    setReceiptSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Setup Menu</h1>
        <p className="text-gray-600 mt-2">Manage your shop information and receipt preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Forms */}
        <div className="space-y-8">
          {/* Shop Information Section */}
          <div>
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Shop Information</h2>
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              {/* Shop Name and Logo Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shop Name *
                  </label>
                  <input
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="Enter your shop name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Logo (Optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const result = event.target?.result as string;
                          setLogo(result);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              {/* Logo Preview */}
              {logo && (
                <div className="flex items-center gap-4">
                  <img 
                    src={logo} 
                    alt="Shop Logo Preview" 
                    className="h-12 w-12 object-contain border rounded"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Logo uploaded</p>
                    <button
                      type="button"
                      onClick={() => setLogo('')}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove Logo
                    </button>
                  </div>
                </div>
              )}
              
              {/* Phone and Address Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter your phone number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter your shop address"
                    rows={1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={saveShopInfo}
                  disabled={loading || !shopName.trim()}
                  className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
                >
                  {loading ? 'Saving...' : 'Save Shop Information'}
                </button>
              </div>
              
              <p className="text-xs text-gray-500">
                This information will appear on all receipts and bills
              </p>
            </div>
          </div>

          {/* Receipt Preferences Section */}
          <div>
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Receipt Preferences</h2>
            <div className="space-y-4">
              {/* Include Logo */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={receiptSettings.includeLogo}
                    onChange={(e) => updateReceiptSetting('includeLogo', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    Include shop logo on receipt
                  </span>
                </label>
              </div>

              {/* Show Customer Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={receiptSettings.showCustomerInfo}
                    onChange={(e) => updateReceiptSetting('showCustomerInfo', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    Show customer information on receipt
                  </span>
                </label>
              </div>

              {/* Footer Message */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Footer Message
                </label>
                <input
                  type="text"
                  value={receiptSettings.footerMessage}
                  onChange={(e) => updateReceiptSetting('footerMessage', e.target.value)}
                  placeholder="Enter footer message for receipts"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This message will appear at the bottom of each receipt
                </p>
              </div>

              {/* Show Terms */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={receiptSettings.showTerms}
                    onChange={(e) => updateReceiptSetting('showTerms', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    Show terms and conditions on receipt
                  </span>
                </label>
              </div>

              {/* Terms Text */}
              {receiptSettings.showTerms && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Terms and Conditions
                  </label>
                  <textarea
                    value={receiptSettings.termsText}
                    onChange={(e) => updateReceiptSetting('termsText', e.target.value)}
                    placeholder="Enter terms and conditions"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              {/* Save Receipt Settings */}
              <div className="flex justify-end">
                <button
                  onClick={saveReceiptSettings}
                  disabled={loading}
                  className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
                >
                  {loading ? 'Saving...' : 'Save Receipt Settings'}
                </button>
              </div>
            </div>
          </div>

          {/* Current Settings Preview */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-3 text-blue-800">Current Settings Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-blue-700 mb-2">Shop Information</h4>
                <div className="space-y-1">
                  <div><strong>Name:</strong> {shopName || 'Not set'}</div>
                  <div><strong>Address:</strong> {address || 'Not set'}</div>
                  <div><strong>Phone:</strong> {phone || 'Not set'}</div>
                  <div><strong>Logo:</strong> {logo ? 'Uploaded' : 'Not set'}</div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-blue-700 mb-2">Receipt Settings</h4>
                <div className="space-y-1">
                  <div><strong>Logo on receipt:</strong> {receiptSettings.includeLogo ? 'Yes' : 'No'}</div>
                  <div><strong>Customer info:</strong> {receiptSettings.showCustomerInfo ? 'Yes' : 'No'}</div>
                  <div><strong>Footer message:</strong> {receiptSettings.footerMessage || 'None'}</div>
                  <div><strong>Terms shown:</strong> {receiptSettings.showTerms ? 'Yes' : 'No'}</div>
                </div>
              </div>
            </div>
          </div>



          {/* Help Section */}
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2 text-yellow-800">Setup Tips</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Your shop name will appear prominently on all receipts</li>
              <li>• You can update these settings anytime</li>
              <li>• Changes take effect immediately after saving</li>
              <li>• Consider keeping footer messages short and friendly</li>
              <li>• Use the receipt preview on the right to see real-time changes</li>
            </ul>
          </div>
        </div>

        {/* Right Column - Receipt Preview */}
        <div className="lg:sticky lg:top-6 lg:h-fit">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Receipt Preview</h2>
            <p className="text-sm text-gray-600 mb-4">
              See how your receipt will look with the current settings. This preview updates as you make changes.
            </p>
            <div className="flex justify-center">
              <div className="relative">
                {receiptSettings.includeLogo && logo && (
                  <div className="mb-4 text-center">
                    <img 
                      src={logo} 
                      alt="Shop Logo" 
                      className="h-20 w-20 object-contain mx-auto border rounded"
                    />
                    <p className="text-xs text-gray-500 mt-1">Logo will appear on receipt</p>
                  </div>
                )}
                <SampleReceipt 
                  billData={{
                    bill_number: 'PREVIEW-001',
                    bill_date: new Date().toISOString(),
                    customer_name: receiptSettings.showCustomerInfo ? 'Sample Customer' : null,
                    customer_phone: receiptSettings.showCustomerInfo ? '+91 9876543210' : null,
                    subtotal: 299.00,
                    discount_amount: 0,
                    discount_percentage: 0,
                    total_amount: 299.00,
                    payment_mode: 'CASH',
                    paid_amount: 299.00,
                    balance_amount: 0,
                    items: [
                      {
                        product_name: 'Sample Product 1',
                        quantity: 1,
                        unit_price: 199.00,
                        total_price: 199.00
                      },
                      {
                        product_name: 'Sample Product 2',
                        quantity: 1,
                        unit_price: 100.00,
                        total_price: 100.00
                      }
                    ]
                  }}
                  shopInfo={{
                    shop_name: shopName || 'Your Shop Name',
                    owner_name: shopName || 'Your Shop Name',
                    address: address || 'Your shop address will appear here',
                    phone: phone || 'Your phone number will appear here'
                  }}
                />
              </div>
            </div>
            <div className="text-center mt-4">
              <p className="text-xs text-gray-500">
                This is how your customers will see their receipts
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupMenu;