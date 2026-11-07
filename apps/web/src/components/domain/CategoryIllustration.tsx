import type { CategoryKey } from '@pc/shared';
import type { CSSProperties, ReactNode } from 'react';
import { CATEGORY_COLOR } from './category';

const A = 'var(--cat)';
const OCCLUDE = 'var(--color-surface-2)';
const range = (from: number, to: number, step: number) =>
  Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => +(from + i * step).toFixed(2));

function Blades({ cx, cy, count, d }: { cx: number; cy: number; count: number; d: string }) {
  return (
    <g transform={`translate(${cx} ${cy})`} strokeOpacity={0.8}>
      {Array.from({ length: count }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed geometry
        <path key={i} d={d} transform={`rotate(${(360 / count) * i})`} />
      ))}
    </g>
  );
}

const cpu = (
  <>
    {range(55, 105, 8.33).map((x) => (
      <g key={x}>
        <line x1={x} y1={23} x2={x} y2={28} />
        <line x1={x} y1={92} x2={x} y2={97} />
      </g>
    ))}
    {range(35, 85, 8.33).map((y) => (
      <g key={y}>
        <line x1={43} y1={y} x2={48} y2={y} />
        <line x1={112} y1={y} x2={117} y2={y} />
      </g>
    ))}
    <rect x={50} y={30} width={60} height={60} rx={3} />
    <rect x={59} y={39} width={42} height={42} rx={4} stroke={A} fill={A} fillOpacity={0.14} />
    <line x1={66} y1={56} x2={88} y2={56} stroke={A} strokeOpacity={0.6} />
    <line x1={66} y1={63} x2={80} y2={63} stroke={A} strokeOpacity={0.6} />
    <path d="M53 87v-6l6 6z" fill="currentColor" stroke="none" />
  </>
);

const mainboard = (
  <>
    <rect x={34} y={12} width={92} height={96} rx={3} />
    {[
      [40, 18],
      [120, 18],
      [40, 102],
      [120, 102],
      [40, 60],
    ].map(([cx, cy]) => (
      <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={2.2} strokeOpacity={0.6} />
    ))}
    <rect x={44} y={24} width={8} height={30} rx={1.5} />
    <rect x={58} y={18} width={26} height={5} rx={1.5} />
    <rect x={58} y={28} width={26} height={26} rx={2} />
    <rect x={63} y={33} width={16} height={16} rx={1} stroke={A} fill={A} fillOpacity={0.18} />
    {[92, 97, 102, 107].map((x) => (
      <rect key={x} x={x} y={22} width={3} height={34} rx={1} />
    ))}
    <rect x={114} y={26} width={6} height={22} rx={1} />
    <rect x={46} y={66} width={56} height={5} rx={1} stroke={A} fill={A} fillOpacity={0.18} />
    <rect x={46} y={82} width={20} height={4} rx={1} />
    <rect x={72} y={80} width={30} height={6} rx={1} strokeDasharray="3 2" />
    <rect x={108} y={76} width={12} height={12} rx={2} />
    <circle cx={50} cy={97} r={2} strokeOpacity={0.6} />
    <circle cx={56} cy={97} r={2} strokeOpacity={0.6} />
  </>
);

const ram = (
  <>
    <rect x={18} y={33} width={124} height={8} rx={2} stroke={A} fill={A} fillOpacity={0.2} />
    <path d="M20 41h120a2 2 0 0 1 2 2v37H85v-4h-6v4H18V43a2 2 0 0 1 2-2z" />
    {range(24, 129, 15).map((x) => (
      <rect key={x} x={x} y={49} width={11} height={16} rx={1} />
    ))}
    {range(22, 138, 3.5)
      .filter((x) => x < 77 || x > 87)
      .map((x) => (
        <line key={x} x1={x} y1={72} x2={x} y2={77} stroke={A} strokeWidth={1.1} />
      ))}
  </>
);

const gpu = (
  <>
    <rect x={10} y={24} width={5} height={64} rx={1} />
    <rect x={18} y={30} width={128} height={52} rx={7} />
    <rect x={124} y={24} width={14} height={6} rx={1} />
    {[56, 110].map((cx) => (
      <g key={cx}>
        <circle cx={cx} cy={56} r={20} />
        <Blades cx={cx} cy={56} count={7} d="M0-6.5C5-9 8.5-14 6.5-18.5" />
        <circle cx={cx} cy={56} r={6} stroke={A} fill={A} fillOpacity={0.22} />
      </g>
    ))}
    <rect x={46} y={82} width={56} height={6} rx={1} stroke={A} />
    {range(49.5, 99, 3.5).map((x) => (
      <line key={x} x1={x} y1={84} x2={x} y2={86.5} stroke={A} strokeWidth={1.1} />
    ))}
  </>
);

const storage = (
  <>
    <path d="M24 46h116a2 2 0 0 1 2 2v8a4 4 0 0 0 0 8v8a2 2 0 0 1-2 2H24a2 2 0 0 1-2-2V61h5v-4h-5v-9a2 2 0 0 1 2-2z" />
    {[...range(48.5, 54.5, 2), ...range(64, 72, 2)].map((y) => (
      <line key={y} x1={22.8} y1={y} x2={29} y2={y} stroke={A} strokeWidth={1.1} />
    ))}
    <rect x={38} y={51} width={18} height={18} rx={1.5} stroke={A} fill={A} fillOpacity={0.16} />
    <rect x={64} y={50} width={30} height={20} rx={1.5} />
    <rect x={100} y={50} width={30} height={20} rx={1.5} />
    <line x1={70} y1={60} x2={86} y2={60} strokeOpacity={0.45} />
    <line x1={106} y1={60} x2={122} y2={60} strokeOpacity={0.45} />
  </>
);

const psu = (
  <>
    <rect x={26} y={20} width={108} height={80} rx={4} />
    {[
      [31, 25],
      [129, 25],
      [31, 95],
      [129, 95],
    ].map(([cx, cy]) => (
      <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={1.6} strokeOpacity={0.6} />
    ))}
    <circle cx={72} cy={60} r={30} stroke={A} />
    <circle cx={72} cy={60} r={22} strokeOpacity={0.55} />
    <circle cx={72} cy={60} r={14} strokeOpacity={0.55} />
    {[45, 135, 225, 315].map((deg) => (
      <line
        key={deg}
        x1={72}
        y1={60}
        x2={72}
        y2={30}
        transform={`rotate(${deg} 72 60)`}
        strokeOpacity={0.55}
      />
    ))}
    <circle cx={72} cy={60} r={5} stroke={A} fill={A} fillOpacity={0.22} />
    <rect x={112} y={34} width={14} height={11} rx={2} />
    <rect x={114} y={53} width={10} height={14} rx={1.5} />
    <line x1={114} y1={60} x2={124} y2={60} />
    {[78, 83, 88].map((y) => (
      <line key={y} x1={112} y1={y} x2={126} y2={y} strokeOpacity={0.55} />
    ))}
  </>
);

const pcCase = (
  <>
    <rect x={44} y={10} width={72} height={96} rx={4} />
    <circle cx={108} cy={15} r={1.6} fill="currentColor" stroke="none" />
    <rect x={52} y={20} width={56} height={64} rx={2} stroke={A} fill={A} fillOpacity={0.07} />
    <rect x={58} y={26} width={30} height={28} rx={1} strokeOpacity={0.45} />
    <rect x={66} y={32} width={12} height={12} rx={1} strokeOpacity={0.7} />
    <rect x={58} y={58} width={32} height={7} rx={1} strokeOpacity={0.7} />
    {[33, 51, 69].map((cy) => (
      <g key={cy} strokeOpacity={0.7}>
        <circle cx={99} cy={cy} r={6.5} />
        <circle cx={99} cy={cy} r={1.5} />
      </g>
    ))}
    <line x1={52} y1={74} x2={108} y2={74} stroke={A} strokeOpacity={0.6} />
    {[92, 97].map((y) => (
      <line key={y} x1={56} y1={y} x2={104} y2={y} strokeOpacity={0.45} />
    ))}
    <rect x={50} y={106} width={12} height={3} rx={1} />
    <rect x={98} y={106} width={12} height={3} rx={1} />
  </>
);

const cooler = (
  <>
    <rect x={62} y={14} width={50} height={72} rx={2} />
    {range(20, 80, 5).map((y) => (
      <line key={y} x1={64} y1={y} x2={110} y2={y} strokeOpacity={0.55} />
    ))}
    {[74, 84, 94, 104].map((x) => (
      <line key={x} x1={x} y1={9} x2={x} y2={92} stroke={A} strokeWidth={2.2} />
    ))}
    <rect x={64} y={90} width={46} height={8} rx={1.5} stroke={A} fill={A} fillOpacity={0.22} />
    <rect x={28} y={26} width={52} height={52} rx={8} fill={OCCLUDE} />
    {[
      [34, 32],
      [74, 32],
      [34, 72],
      [74, 72],
    ].map(([cx, cy]) => (
      <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={2} strokeOpacity={0.6} />
    ))}
    <circle cx={54} cy={52} r={22} />
    <Blades cx={54} cy={52} count={7} d="M0-7C6-10 10-16 8-21" />
    <circle cx={54} cy={52} r={6.5} stroke={A} fill={A} fillOpacity={0.22} />
  </>
);

const DRAWINGS: Record<CategoryKey, ReactNode> = {
  cpu,
  mainboard,
  ram,
  gpu,
  storage,
  psu,
  case: pcCase,
  cooler,
};

interface CategoryIllustrationProps {
  category: CategoryKey;
  className?: string;
}

/** Technical line drawing of a part, inked in the current text colour with the category colour on key details. */
export function CategoryIllustration({ category, className }: CategoryIllustrationProps) {
  return (
    <svg
      viewBox="0 0 160 120"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
      style={{ '--cat': CATEGORY_COLOR[category] } as CSSProperties}
    >
      {DRAWINGS[category]}
    </svg>
  );
}
