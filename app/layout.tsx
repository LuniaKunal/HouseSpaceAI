import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import '@/index.css';
import { ClientAppShell } from './ClientAppShell';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#17201d',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://house-space-ai.vercel.app'),
  title: {
    default: 'HouseSpace | Free Home Planning & 3D Design Tool',
    template: '%s | HouseSpace',
  },
  description: 'Plan rooms, furniture, and finishes in 2D and 3D. Explore a furnished 3BHK home, walk through the design, and start free with HouseSpace.',
  applicationName: 'HouseSpace',
  verification: {
    google: 'google22d0f337ddb3b575',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    siteName: 'HouseSpace',
    locale: 'en_US',
    title: 'HouseSpace | Free Home Planning & 3D Design Tool',
    description: 'Plan rooms, furniture, and finishes in 2D and 3D. Explore a furnished 3BHK home, walk through the design, and start free with HouseSpace.',
    url: 'https://house-space-ai.vercel.app/',
    images: [
      {
        url: 'https://house-space-ai.vercel.app/cad/floorplan_3bhk.jpg',
        width: 1200,
        height: 630,
        alt: 'HouseSpace furnished home floor plan preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HouseSpace | Free Home Planning & 3D Design Tool',
    description: 'Plan rooms, furniture, and finishes in 2D and 3D. Explore a furnished 3BHK home, walk through the design, and start free with HouseSpace.',
    images: ['https://house-space-ai.vercel.app/cad/floorplan_3bhk.jpg'],
  },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2317201d' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z'/><polyline points='3.29 7 12 12 20.71 7'/><line x1='12' y1='22' x2='12' y2='12'/></svg>",
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'HouseSpace',
  applicationCategory: 'DesignApplication',
  operatingSystem: 'Web browser',
  url: 'https://house-space-ai.vercel.app/',
  image: 'https://house-space-ai.vercel.app/cad/floorplan_3bhk.jpg',
  description: 'Plan rooms, furniture, and finishes in 2D and 3D. Explore a furnished 3BHK home, walk through the design, and start free with HouseSpace.',
  isAccessibleForFree: true,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    url: 'https://house-space-ai.vercel.app/',
  },
  featureList: [
    '2D home floor planning',
    '3D home walkthroughs',
    'Furniture and material planning',
    'Saved home projects',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-[#0f1117] text-slate-100 overflow-hidden select-none font-sans antialiased">
        <ClientAppShell>
          {children}
        </ClientAppShell>
      </body>
    </html>
  );
}
