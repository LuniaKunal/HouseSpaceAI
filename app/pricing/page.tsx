import type { Metadata } from 'next';
import { PricingPage } from '@/components/pricing/PricingPage';

export const metadata: Metadata = {
  title: 'Pricing | Free Home Planning Preview',
  description: 'Use HouseSpace free during preview to plan homes in 2D, 3D, and walk view. No card, payment gate, or setup required.',
  alternates: {
    canonical: 'https://house-space-ai.vercel.app/pricing',
  },
  openGraph: {
    title: 'HouseSpace Pricing | Free Home Planning Preview',
    description: 'Use HouseSpace free during preview to plan homes in 2D, 3D, and walk view. No card, payment gate, or setup required.',
    url: 'https://house-space-ai.vercel.app/pricing',
  },
};

export default function PricingRoute() {
  return <PricingPage />;
}
