import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

export const metadata: Metadata = {
  title: 'AI Room Design from Photos',
  description: 'Upload a room photo, explore interior styles, and compare design concepts in HouseSpace.',
  robots: {
    index: false,
    follow: false,
  },
};

const PhotoWorkspace = dynamic(
  () => import('@/features/photo-design/PhotoWorkspace'),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center p-8 text-slate-400" role="status">
        Loading photo workspace...
      </div>
    ),
  }
);

export default function PhotosRoute() {
  return <PhotoWorkspace />;
}
