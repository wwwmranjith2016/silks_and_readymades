export interface ShopSettings {
  shopName: string;
  address: string;
  phone: string;
  logo: string;
  receiptSettings: {
    includeLogo: boolean;
    showCustomerInfo: boolean;
    footerMessage: string;
    showTerms: boolean;
    termsText: string;
  };
}

export const getShopSettings = (): ShopSettings => {
  const shopName = localStorage.getItem('shopName') || 'My Shop';
  const address = localStorage.getItem('shopAddress') || '';
  const phone = localStorage.getItem('shopPhone') || '';
  const logo = localStorage.getItem('shopLogo') || '';
  const receiptSettingsStr = localStorage.getItem('receiptSettings');
  const receiptSettings = receiptSettingsStr ? JSON.parse(receiptSettingsStr) : {
    includeLogo: true,
    showCustomerInfo: true,
    footerMessage: 'Thank you for your business!',
    showTerms: false,
    termsText: ''
  };

  return {
    shopName,
    address,
    phone,
    logo,
    receiptSettings
  };
};

export const getShopInfo = () => {
  const settings = getShopSettings();
  return {
    shop_name: settings.shopName,
    owner_name: settings.shopName, // Using shop name as owner name for simplicity
    address: settings.address,
    phone: settings.phone
  };
};