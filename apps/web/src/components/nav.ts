import {
  IconBuildingStore,
  IconCash,
  IconChartBar,
  IconCoins,
  IconFileInvoice,
  IconHome,
  IconLock,
  IconMessage,
  IconPackage,
  IconSettings,
  IconShoppingCart,
  IconTruckDelivery,
  IconUsers,
  IconUserShield,
  type Icon,
} from '@tabler/icons-react';

export interface NavItem {
  href: string;
  label: string;
  icon: Icon;
  /** app_section code; the item is shown only with view permission. */
  section?: string;
}

// Pages beyond the dashboard are added as each module is built.
export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'داشبورد', icon: IconHome },
  { href: '/orders', label: 'سفارش‌ها', icon: IconShoppingCart, section: 'ORDERS' },
  {
    href: '/purchase-invoices',
    label: 'فاکتور خرید',
    icon: IconFileInvoice,
    section: 'PURCHASE_INVOICES',
  },
  { href: '/payments', label: 'پرداخت‌ها', icon: IconCash, section: 'PAYMENTS' },
  { href: '/customers', label: 'مشتریان', icon: IconUsers, section: 'CUSTOMERS' },
  { href: '/custody', label: 'امانات', icon: IconLock, section: 'CUSTODY' },
  { href: '/dealers', label: 'بنکداران', icon: IconTruckDelivery, section: 'DEALERS' },
  { href: '/rates', label: 'نرخ‌ها', icon: IconCoins, section: 'RATES' },
  { href: '/catalog', label: 'کالاها', icon: IconPackage, section: 'CATALOG' },
  { href: '/inventory', label: 'موجودی', icon: IconBuildingStore, section: 'INVENTORY' },
  { href: '/reports', label: 'گزارش‌ها', icon: IconChartBar, section: 'REPORTS' },
  { href: '/sms', label: 'پیامک', icon: IconMessage, section: 'SMS' },
  { href: '/users', label: 'کاربران و نقش‌ها', icon: IconUserShield, section: 'USERS_ROLES' },
  { href: '/settings', label: 'تنظیمات', icon: IconSettings, section: 'SETTINGS' },
];
