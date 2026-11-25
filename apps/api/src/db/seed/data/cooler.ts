import type { Color, Socket } from '@pc/shared';
import { ALL_SOCKETS, type SeedProduct, sku } from './helpers';

const K: Color = 'black';
const W: Color = 'white';
const O: Color = 'other';

const ALL: Socket[] = [...ALL_SOCKETS];
const INTEL: Socket[] = ['LGA1700', 'LGA1851'];

// brand, code, name, sockets, height mm (air) | radiator mm (aio), TDP rating W, rgb, color, price VND, stock
type AirRow = [string, string, string, Socket[], number, number, boolean, Color, number, number];
type AioRow = [string, string, string, Socket[], number, number, boolean, Color, number, number];

const AIR: AirRow[] = [
  ['DeepCool', 'AG400', 'DeepCool AG400', ALL, 148, 220, false, K, 390_000, 30],
  ['DeepCool', 'AK400', 'DeepCool AK400', ALL, 155, 220, false, K, 490_000, 28],
  ['DeepCool', 'AK400-DIGITAL', 'DeepCool AK400 Digital', ALL, 155, 220, false, K, 790_000, 14],
  ['DeepCool', 'AK620', 'DeepCool AK620', ALL, 160, 260, false, K, 1_190_000, 15],
  ['DeepCool', 'ASSASSIN-IV', 'DeepCool Assassin IV', ALL, 164, 280, false, K, 1_890_000, 7],
  ['Thermalright', 'PA120-SE', 'Thermalright Peerless Assassin 120 SE', ALL, 155, 245, false, K, 690_000, 25],
  [
    'Thermalright',
    'PA120-ARGB-W',
    'Thermalright Peerless Assassin 120 White ARGB',
    ALL,
    155,
    245,
    true,
    W,
    890_000,
    12,
  ],
  [
    'Thermalright',
    'PHANTOM-SPIRIT-120-SE',
    'Thermalright Phantom Spirit 120 SE',
    ALL,
    154,
    260,
    false,
    K,
    990_000,
    9,
  ],
  ['Thermalright', 'AXP90-X53', 'Thermalright AXP90-X53 Low Profile', ALL, 53, 105, false, K, 490_000, 11],
  ['Cooler Master', 'HYPER-212-BLACK', 'Cooler Master Hyper 212 Black', ALL, 159, 150, false, K, 650_000, 17],
  [
    'Cooler Master',
    'HYPER-212-HALO',
    'Cooler Master Hyper 212 Halo Black ARGB',
    ALL,
    158,
    180,
    true,
    K,
    890_000,
    10,
  ],
  ['ID-Cooling', 'SE-214-XT', 'ID-COOLING SE-214-XT', ALL, 154, 180, false, K, 450_000, 0],
  ['be quiet!', 'PURE-ROCK-2', 'be quiet! Pure Rock 2', ALL, 155, 150, false, K, 990_000, 8],
  ['be quiet!', 'DARK-ROCK-PRO-5', 'be quiet! Dark Rock Pro 5', ALL, 168, 270, false, K, 2_890_000, 4],
  ['Noctua', 'NH-U12S', 'Noctua NH-U12S', ALL, 158, 180, false, O, 2_190_000, 6],
  ['Noctua', 'NH-D15-G2', 'Noctua NH-D15 G2', ALL, 168, 250, false, O, 3_890_000, 5],
  ['Noctua', 'NH-L9I-17XX', 'Noctua NH-L9i-17xx Low Profile', INTEL, 37, 65, false, O, 1_290_000, 7],
];

const AIO: AioRow[] = [
  ['DeepCool', 'LE520', 'DeepCool LE520 240mm ARGB', ALL, 240, 250, true, K, 1_590_000, 18],
  ['DeepCool', 'LS520-SE-W', 'DeepCool LS520 SE 240mm White', ALL, 240, 260, true, W, 2_190_000, 9],
  ['DeepCool', 'LT720', 'DeepCool LT720 360mm', ALL, 360, 350, true, K, 3_190_000, 8],
  ['Arctic', 'LF3-240', 'Arctic Liquid Freezer III 240mm', ALL, 240, 300, false, K, 2_190_000, 10],
  ['Arctic', 'LF3-PRO-360', 'Arctic Liquid Freezer III Pro 360mm', ALL, 360, 350, false, K, 2_890_000, 7],
  ['NZXT', 'KRAKEN-240', 'NZXT Kraken 240 LCD', ALL, 240, 280, true, K, 3_290_000, 5],
  [
    'Lian Li',
    'GALAHAD-II-TRINITY-360-W',
    'Lian Li Galahad II Trinity 360mm White',
    ALL,
    360,
    350,
    true,
    W,
    3_590_000,
    6,
  ],
  ['MSI', 'MAG-CORELIQUID-E240', 'MSI MAG CoreLiquid E240', ALL, 240, 250, true, K, 1_690_000, 13],
  [
    'Thermalright',
    'FROZEN-WARFRAME-360',
    'Thermalright Frozen Warframe 360 ARGB',
    ALL,
    360,
    350,
    true,
    K,
    1_690_000,
    11,
  ],
  [
    'Corsair',
    'H150I-ELITE-LCD-XT',
    'Corsair iCUE H150i Elite LCD XT 360mm',
    ALL,
    360,
    380,
    true,
    K,
    6_490_000,
    0,
  ],
];

export const COOLERS: SeedProduct<'cooler'>[] = [
  ...AIR.map(
    ([brand, code, name, sockets, height, tdp, rgb, color, price, stock]): SeedProduct<'cooler'> => ({
      sku: sku('cooler', brand, code),
      brand,
      name,
      price,
      stock,
      specs: { type: 'air', sockets, heightMm: height, tdpRatingW: tdp, rgb, color },
      description: `Tản nhiệt khí ${name}: cao ${height}mm, tản tối đa khoảng ${tdp}W.`,
    }),
  ),
  ...AIO.map(
    ([brand, code, name, sockets, radiator, tdp, rgb, color, price, stock]): SeedProduct<'cooler'> => ({
      sku: sku('cooler', brand, code),
      brand,
      name,
      price,
      stock,
      specs: { type: 'aio', sockets, radiatorMm: radiator, tdpRatingW: tdp, rgb, color },
      description: `Tản nhiệt nước AIO ${name}: radiator ${radiator}mm, tản tối đa khoảng ${tdp}W.`,
    }),
  ),
];
