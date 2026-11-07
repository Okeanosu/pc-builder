import { type SeedProduct, sku } from './helpers';

// brand, code, name, capacity GB, read MB/s, write MB/s, price VND, stock — NVMe M.2 unless listed in SATA
type Row = [string, string, string, number, number, number, number, number];

const NVME: Row[] = [
  ['Samsung', '990PRO-1T', 'Samsung 990 PRO 1TB NVMe PCIe 4.0', 1000, 7450, 6900, 3_090_000, 18],
  ['Samsung', '990PRO-2T', 'Samsung 990 PRO 2TB NVMe PCIe 4.0', 2000, 7450, 6900, 5_190_000, 10],
  ['Samsung', '990PRO-4T', 'Samsung 990 PRO 4TB NVMe PCIe 4.0', 4000, 7450, 6900, 10_390_000, 0],
  ['Samsung', '990EVO-PLUS-1T', 'Samsung 990 EVO Plus 1TB NVMe PCIe 4.0', 1000, 7150, 6300, 2_390_000, 15],
  ['Samsung', '9100PRO-2T', 'Samsung 9100 PRO 2TB NVMe PCIe 5.0', 2000, 14700, 13400, 8_890_000, 4],
  ['WD', 'SN850X-1T', 'WD Black SN850X 1TB NVMe PCIe 4.0', 1000, 7300, 6300, 2_990_000, 12],
  ['WD', 'SN850X-2T', 'WD Black SN850X 2TB NVMe PCIe 4.0', 2000, 7300, 6600, 5_090_000, 7],
  ['WD', 'SN580-500G', 'WD Blue SN580 500GB NVMe PCIe 4.0', 500, 4000, 3600, 1_190_000, 25],
  ['WD', 'SN580-1T', 'WD Blue SN580 1TB NVMe PCIe 4.0', 1000, 4150, 4150, 1_890_000, 22],
  ['Kingston', 'NV2-500G', 'Kingston NV2 500GB NVMe PCIe 4.0', 500, 3500, 2100, 990_000, 30],
  ['Kingston', 'NV2-1T', 'Kingston NV2 1TB NVMe PCIe 4.0', 1000, 3500, 2100, 1_690_000, 26],
  ['Kingston', 'NV2-2T', 'Kingston NV2 2TB NVMe PCIe 4.0', 2000, 3500, 2800, 3_190_000, 13],
  ['Kingston', 'KC3000-1T', 'Kingston KC3000 1TB NVMe PCIe 4.0', 1000, 7000, 6000, 2_890_000, 9],
  ['Kingston', 'KC3000-2T', 'Kingston KC3000 2TB NVMe PCIe 4.0', 2000, 7000, 7000, 4_890_000, 6],
  ['Crucial', 'P3-PLUS-1T', 'Crucial P3 Plus 1TB NVMe PCIe 4.0', 1000, 5000, 3600, 1_890_000, 21],
  ['Crucial', 'P3-PLUS-2T', 'Crucial P3 Plus 2TB NVMe PCIe 4.0', 2000, 5000, 4200, 3_590_000, 11],
  ['Crucial', 'T500-1T', 'Crucial T500 1TB NVMe PCIe 4.0', 1000, 7300, 6800, 2_890_000, 8],
  ['Crucial', 'T705-2T', 'Crucial T705 2TB NVMe PCIe 5.0', 2000, 14500, 12700, 9_790_000, 0],
  ['Lexar', 'NM790-1T', 'Lexar NM790 1TB NVMe PCIe 4.0', 1000, 7400, 6500, 2_290_000, 16],
  ['Lexar', 'NM790-2T', 'Lexar NM790 2TB NVMe PCIe 4.0', 2000, 7400, 6500, 3_990_000, 8],
  ['Lexar', 'NM620-512G', 'Lexar NM620 512GB NVMe PCIe 3.0', 512, 3500, 2400, 890_000, 19],
  ['SK hynix', 'P41-1T', 'SK hynix Platinum P41 1TB NVMe PCIe 4.0', 1000, 7000, 6500, 3_290_000, 5],
];

const SATA: Row[] = [
  ['Samsung', '870EVO-500G', 'Samsung 870 EVO 500GB SATA III 2.5"', 500, 560, 530, 1_490_000, 14],
  ['Samsung', '870EVO-1T', 'Samsung 870 EVO 1TB SATA III 2.5"', 1000, 560, 530, 2_590_000, 9],
  ['Crucial', 'MX500-1T', 'Crucial MX500 1TB SATA III 2.5"', 1000, 560, 510, 2_390_000, 11],
  ['Kingston', 'A400-480G', 'Kingston A400 480GB SATA III 2.5"', 480, 500, 450, 790_000, 28],
  ['WD', 'SA510-1T', 'WD Blue SA510 1TB SATA III 2.5"', 1000, 560, 520, 2_090_000, 0],
];

const build = (rows: Row[], iface: 'NVMe' | 'SATA'): SeedProduct<'storage'>[] =>
  rows.map(([brand, code, name, capacity, read, write, price, stock]) => ({
    sku: sku('storage', brand, code),
    brand,
    name,
    price,
    stock,
    specs: {
      interface: iface,
      formFactor: iface === 'NVMe' ? 'M.2' : '2.5"',
      capacityGB: capacity,
      readMBps: read,
      writeMBps: write,
    },
    description: `Ổ cứng SSD ${name}: đọc ${read}MB/s, ghi ${write}MB/s.`,
  }));

export const STORAGES: SeedProduct<'storage'>[] = [...build(NVME, 'NVMe'), ...build(SATA, 'SATA')];
