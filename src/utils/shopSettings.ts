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
    owner_name: settings.shopName,
    address: settings.address,
    phone: settings.phone,
    logo: settings.logo,
    footer_message: settings.receiptSettings.footerMessage,
    include_logo: settings.receiptSettings.includeLogo,
    show_customer_info: settings.receiptSettings.showCustomerInfo,
    show_terms: settings.receiptSettings.showTerms,
    terms_text: settings.receiptSettings.termsText
  };
};