export const CATEGORY_KEYS = ['cpu', 'mainboard', 'ram', 'gpu', 'storage', 'psu', 'case', 'cooler'] as const;
export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  cpu: 'CPU',
  mainboard: 'Mainboard',
  ram: 'RAM',
  gpu: 'Card đồ họa',
  storage: 'Ổ cứng',
  psu: 'Nguồn',
  case: 'Vỏ case',
  cooler: 'Tản nhiệt',
};

export const PURPOSES = ['gaming', 'graphics', 'ai', 'office'] as const;
export type Purpose = (typeof PURPOSES)[number];

export const PURPOSE_LABELS: Record<Purpose, string> = {
  gaming: 'Chơi game',
  graphics: 'Đồ họa / Dựng phim',
  ai: 'Lập trình / AI',
  office: 'Văn phòng / Học tập',
};

export const ROLES = ['CUSTOMER', 'STAFF', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

export const ORDER_STATUSES = [
  'PENDING_PAYMENT',
  'PAID',
  'PROCESSING',
  'SHIPPING',
  'COMPLETED',
  'CANCELLED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  PROCESSING: 'Đang xử lý / lắp ráp',
  SHIPPING: 'Đang giao',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

export const ORDER_TYPES = ['RETAIL', 'BUILD'] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

export const PAYMENT_STATUSES = ['UNPAID', 'PAID', 'REFUNDED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const BUILD_SOURCES = ['CHAT', 'FORM', 'CUSTOM'] as const;
export type BuildSource = (typeof BUILD_SOURCES)[number];

export const BUILD_LABELS = ['performance', 'balanced', 'budget'] as const;
export type BuildLabel = (typeof BUILD_LABELS)[number];

export const BUILD_LABEL_TEXT: Record<BuildLabel, string> = {
  performance: 'Tối ưu hiệu năng',
  balanced: 'Cân bằng',
  budget: 'Tiết kiệm',
};

export const CHAT_MODES = ['AI', 'FALLBACK'] as const;
export type ChatMode = (typeof CHAT_MODES)[number];

export const MIN_BUDGET = 5_000_000;
export const MAX_BUDGET = 200_000_000;
