import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

export const metadata: Metadata = {
  title: '3D Home Design Studio',
  description: 'Edit rooms, furniture, materials, and views in the HouseSpace 3D home design studio.',
  robots: {
    index: false,
    follow: false,
  },
};

const StudioWorkspace = dynamic(
  () => import('@/components/StudioWorkspace'),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center p-8 text-slate-400" role="status">
        Opening 3D studio workspace...
      </div>
    ),
  }
);

export default function StudioRoute() {
  return <StudioWorkspace />;
}
