import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

export const metadata: Metadata = {
  title: 'Home Projects Dashboard',
  description: 'Open and manage your saved HouseSpace home planning projects.',
  robots: {
    index: false,
    follow: false,
  },
};

const ProjectsDashboard = dynamic(
  () => import('@/components/dashboard/ProjectsDashboard').then(m => m.ProjectsDashboard),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center p-8 text-slate-400" role="status">
        Loading projects...
      </div>
    ),
  }
);

export default function ProjectsRoute() {
  return <ProjectsDashboard />;
}
