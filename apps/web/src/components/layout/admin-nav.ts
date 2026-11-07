import {
  Gauge,
  LayoutDashboard,
  type LucideIcon,
  MessagesSquare,
  Package,
  Receipt,
  SlidersHorizontal,
  Warehouse,
} from 'lucide-react';

export interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Admin sidebar entries; plain module so server components (e.g. route guards, breadcrumbs) can import it. */
export const ADMIN_NAV: AdminNavItem[] = [
  { href: '/admin', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/admin/products', label: 'Sản phẩm', icon: Package },
  { href: '/admin/inventory', label: 'Tồn kho', icon: Warehouse },
  { href: '/admin/benchmarks', label: 'Benchmark', icon: Gauge },
  { href: '/admin/weights', label: 'Trọng số thuật toán', icon: SlidersHorizontal },
  { href: '/admin/orders', label: 'Đơn hàng', icon: Receipt },
  { href: '/admin/chats', label: 'Hội thoại AI', icon: MessagesSquare },
];
