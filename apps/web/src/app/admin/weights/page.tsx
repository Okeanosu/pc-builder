import type { Metadata } from 'next';
import { WeightsPage } from '@/features/admin/weights/WeightsPage';

export const instant = false;
export const metadata: Metadata = { title: 'Trọng số thuật toán' };

export default function AdminWeightsRoute() {
  return <WeightsPage />;
}
