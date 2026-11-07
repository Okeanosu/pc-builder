import type {
  BuildLabel,
  BuildSource,
  CategoryKey,
  ChatMode,
  InfeasibleReason,
  OrderStatus,
  OrderType,
  PaymentStatus,
  Purpose,
  Role,
} from './constants';
import type { AnySpecs, Benchmark, SpecField } from './specs';

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface UserDTO {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
}

export interface CategoryDTO {
  id: string;
  key: CategoryKey;
  slug: string;
  name: string;
  specSchema: SpecField[];
}

export interface FacetDTO {
  key: string;
  label: string;
  type: SpecField['type'];
  values: { value: string; count: number }[];
}

export interface ProductSummaryDTO {
  id: string;
  slug: string;
  sku: string;
  name: string;
  brand: string;
  category: CategoryKey;
  price: number;
  salePrice: number | null;
  stock: number;
  image: string | null;
  /** A handful of headline specs for cards, e.g. { socket: 'AM5', cores: 8 } */
  keySpecs: Record<string, string | number | boolean>;
}

export interface ProductDTO extends ProductSummaryDTO {
  images: string[];
  specs: AnySpecs;
  benchmark: Benchmark | null;
  description: string | null;
  commercialBoost: number;
}

export interface CompatibilityIssueDTO {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  categories: CategoryKey[];
}

export interface CompatibilityResultDTO {
  ok: boolean;
  issues: CompatibilityIssueDTO[];
  estimatedWattage: number;
  recommendedPsuWattage: number;
}

export interface BuildItemDTO {
  category: CategoryKey;
  product: ProductSummaryDTO;
}

export interface BuildDTO {
  id: string;
  name: string;
  label: BuildLabel | null;
  purpose: Purpose;
  budget: number;
  source: BuildSource;
  items: BuildItemDTO[];
  totalPrice: number;
  score: number;
  scoreBreakdown: Partial<Record<CategoryKey, number>>;
  /** Share of total price per category, 0..1 */
  allocation: Partial<Record<CategoryKey, number>>;
  estimatedWattage: number;
  recommendedPsuWattage: number;
  warnings: CompatibilityIssueDTO[];
  createdAt: string;
}

export interface RecommendationResultDTO {
  builds: BuildDTO[];
  stats: {
    strategy: string;
    nodesExplored: number;
    prunedByAc3: number;
    prunedByForwardChecking: number;
    prunedByBound: number;
    timeMs: number;
  };
  infeasibleReason?: InfeasibleReason;
  minFeasibleBudget?: number;
}

export interface CartItemDTO {
  id: string;
  product: ProductSummaryDTO;
  qty: number;
  buildId: string | null;
  lineTotal: number;
}

export interface CartDTO {
  items: CartItemDTO[];
  subtotal: number;
  itemCount: number;
  /** Fee added to an assembled-build order at checkout (server ASSEMBLY_FEE), not included in `subtotal`. */
  assemblyFee: number;
}

export interface OrderItemDTO {
  productId: string;
  name: string;
  price: number;
  qty: number;
  buildId: string | null;
}

export interface OrderDTO {
  id: string;
  code: string;
  type: OrderType;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  items: OrderItemDTO[];
  subtotal: number;
  assemblyFee: number;
  shippingFee: number;
  total: number;
  shippingName: string;
  phone: string;
  address: string;
  note: string | null;
  paidAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface PaymentInfoDTO {
  orderCode: string;
  amount: number;
  /** Only while the order awaits payment; null once paid, cancelled or expired. */
  qrImageUrl: string | null;
  bankBin: string;
  accountNo: string;
  accountName: string;
  transferContent: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  expiresAt: string | null;
}

export interface ChatMessageDTO {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolName: string | null;
  builds: BuildDTO[];
  createdAt: string;
}

export interface ChatSessionDTO {
  id: string;
  title: string | null;
  mode: ChatMode;
  messages: ChatMessageDTO[];
  createdAt: string;
}

export interface RevenuePointDTO {
  period: string;
  revenue: number;
  orders: number;
}
