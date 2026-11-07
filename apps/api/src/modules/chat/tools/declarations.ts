import { CATEGORY_KEYS, FORM_FACTORS, GPU_BRANDS, MAX_BUDGET, MIN_BUDGET, PURPOSES } from '@pc/shared';
import type { LlmToolDecl } from '../llm/types';

const RESOLUTIONS = ['1080p', '1440p', '4k'];

const preferencesSchema = {
  type: 'object',
  description: 'Sở thích của khách; chỉ điền trường khách đã nêu rõ.',
  properties: {
    cpuBrand: { type: 'string', enum: ['AMD', 'Intel'], description: 'Hãng CPU mong muốn.' },
    gpuBrand: { type: 'string', enum: [...GPU_BRANDS], description: 'Hãng chip card đồ họa mong muốn.' },
    color: { type: 'string', enum: ['black', 'white'], description: 'Tông màu chủ đạo của bộ máy.' },
    formFactor: { type: 'string', enum: [...FORM_FACTORS], description: 'Kích thước mainboard/case.' },
    minRamGB: { type: 'integer', minimum: 8, description: 'Dung lượng RAM tối thiểu (GB).' },
    minStorageGB: {
      type: 'integer',
      minimum: 128,
      description: 'Dung lượng ổ cứng tối thiểu (GB, 1TB = 1000).',
    },
    needWifi: { type: 'boolean', description: 'Cần mainboard có Wi-Fi.' },
    rgb: { type: 'boolean', description: 'Thích linh kiện có đèn RGB.' },
    resolution: { type: 'string', enum: RESOLUTIONS, description: 'Độ phân giải màn hình chơi game.' },
    requireDiscreteGpu: { type: 'boolean', description: 'Bắt buộc có card đồ họa rời.' },
  },
};

const productIdList = (description: string) => ({
  type: 'array',
  items: { type: 'string' },
  description,
});

export const TOOL_DECLARATIONS: LlmToolDecl[] = [
  {
    name: 'recommend_builds',
    description:
      'Gợi ý 1–3 cấu hình PC tương thích 100%, còn hàng, trong ngân sách bằng Optimization Engine. ' +
      'Gọi khi đã biết ngân sách và mục đích sử dụng. Thẻ cấu hình sẽ tự hiển thị cho khách.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        budget: {
          type: 'integer',
          minimum: MIN_BUDGET,
          maximum: MAX_BUDGET,
          description: 'Ngân sách tối đa, số nguyên VND (25 triệu = 25000000).',
        },
        purpose: {
          type: 'string',
          enum: [...PURPOSES],
          description:
            'gaming = chơi game, graphics = đồ họa/dựng phim, ai = lập trình/AI, office = văn phòng/học tập.',
        },
        resolution: {
          type: 'string',
          enum: RESOLUTIONS,
          description: 'Độ phân giải chơi game (2K = 1440p).',
        },
        preferences: preferencesSchema,
        excludeProductIds: productIdList('ID sản phẩm khách không muốn dùng.'),
        mustIncludeProductIds: productIdList('ID sản phẩm bắt buộc có trong cấu hình.'),
      },
      required: ['budget', 'purpose'],
    },
  },
  {
    name: 'search_products',
    description: 'Tìm tối đa 8 sản phẩm còn hàng theo danh mục, từ khóa, khoảng giá và thông số.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', enum: [...CATEGORY_KEYS], description: 'Danh mục linh kiện.' },
        keyword: { type: 'string', description: 'Từ khóa tên/model, ví dụ "RTX 4060".' },
        minPrice: { type: 'integer', minimum: 0, description: 'Giá thấp nhất (VND).' },
        maxPrice: { type: 'integer', minimum: 0, description: 'Giá cao nhất (VND).' },
        filters: {
          type: 'object',
          additionalProperties: { type: 'string' },
          description: 'Lọc theo thông số kỹ thuật, ví dụ {"socket":"AM5","memoryType":"DDR5"}.',
        },
      },
      required: ['category'],
    },
  },
  {
    name: 'get_product_details',
    description: 'Lấy thông số chính và điểm benchmark của một sản phẩm theo ID.',
    parametersJsonSchema: {
      type: 'object',
      properties: { productId: { type: 'string', description: 'ID sản phẩm.' } },
      required: ['productId'],
    },
  },
  {
    name: 'check_compatibility',
    description: 'Kiểm tra tương thích một danh sách linh kiện; trả về lỗi/cảnh báo và công suất ước tính.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        productIds: { ...productIdList('ID các linh kiện cần kiểm tra.'), minItems: 1, maxItems: 16 },
      },
      required: ['productIds'],
    },
  },
  {
    name: 'modify_build',
    description:
      'Chỉnh một cấu hình đã gợi ý: thay linh kiện một danh mục, tăng/giảm ngân sách hoặc đổi sở thích; ' +
      'Engine giải lại và giữ nguyên các phần còn lại.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        buildId: { type: 'string', description: 'ID cấu hình cần chỉnh (lấy từ kết quả trước).' },
        replaceCategory: { type: 'string', enum: [...CATEGORY_KEYS], description: 'Danh mục cần thay.' },
        newProductId: { type: 'string', description: 'ID sản phẩm thay thế cho danh mục đó.' },
        budgetDelta: {
          type: 'integer',
          description: 'Thay đổi ngân sách (VND), âm = rẻ hơn, dương = mạnh hơn.',
        },
        preferenceChanges: preferencesSchema,
      },
      required: ['buildId'],
    },
  },
];
