import { useEffect } from 'react';
import type { ActiveView } from './state/uiStore';

const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://house-space-ai.vercel.app').replace(/\/+$/, '');
const SHARE_IMAGE = `${SITE_URL}/cad/floorplan_3bhk.jpg`;

type SeoConfig = {
  title: string;
  description: string;
  path: string;
  indexable: boolean;
};

const SEO_BY_VIEW: Record<ActiveView, SeoConfig> = {
  landing: {
    title: 'HouseSpace | Free Home Planning & 3D Design Tool',
    description: 'Plan rooms, furniture, and finishes in 2D and 3D. Explore a furnished 3BHK home, walk through the design, and start free with HouseSpace.',
    path: '/',
    indexable: true
  },
  pricing: {
    title: 'HouseSpace Pricing | Free Home Planning Preview',
    description: 'Use HouseSpace free during preview to plan homes in 2D, 3D, and walk view. No card, payment gate, or setup required.',
    path: '/pricing',
    indexable: true
  },
  photos: {
    title: 'AI Room Design from Photos | HouseSpace',
    description: 'Upload a room photo, explore interior styles, and compare design concepts in HouseSpace.',
    path: '/photos',
    indexable: false
  },
  dashboard: {
    title: 'Home Projects Dashboard | HouseSpace',
    description: 'Open and manage your saved HouseSpace home planning projects.',
    path: '/projects',
    indexable: false
  },
  studio: {
    title: '3D Home Design Studio | HouseSpace',
    description: 'Edit rooms, furniture, materials, and views in the HouseSpace 3D home design studio.',
    path: '/studio',
    indexable: false
  }
};

function setMeta(attribute: 'name' | 'property', key: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }
  tag.content = content;
}

function setCanonical(url: string) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = url;
}

function setStructuredData(config: SeoConfig, canonical: string) {
  const existing = document.head.querySelector<HTMLScriptElement>('script[data-housespace-seo]');
  if (existing) existing.remove();
  if (!config.indexable) return;

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.dataset.housespaceSeo = 'true';
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'HouseSpace',
    applicationCategory: 'DesignApplication',
    operatingSystem: 'Web browser',
    url: canonical,
    image: SHARE_IMAGE,
    description: config.description,
    isAccessibleForFree: true,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      url: canonical
    },
    featureList: [
      '2D home floor planning',
      '3D home walkthroughs',
      'Furniture and material planning',
      'Saved home projects'
    ]
  });
  document.head.appendChild(script);
}

export function SiteSEO({ view }: { view: ActiveView }) {
  useEffect(() => {
    const config = SEO_BY_VIEW[view];
    const canonical = `${SITE_URL}${config.path}`;
    const robots = config.indexable ? 'index,follow' : 'noindex,nofollow';

    document.documentElement.lang = 'en';
    document.title = config.title;
    setMeta('name', 'description', config.description);
    setMeta('name', 'robots', robots);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:site_name', 'HouseSpace');
    setMeta('property', 'og:locale', 'en_US');
    setMeta('property', 'og:title', config.title);
    setMeta('property', 'og:description', config.description);
    setMeta('property', 'og:url', canonical);
    setMeta('property', 'og:image', SHARE_IMAGE);
    setMeta('property', 'og:image:alt', 'HouseSpace furnished home floor plan preview');
    setMeta('property', 'og:image:type', 'image/jpeg');
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', config.title);
    setMeta('name', 'twitter:description', config.description);
    setMeta('name', 'twitter:image', SHARE_IMAGE);
    setMeta('name', 'twitter:image:alt', 'HouseSpace furnished home floor plan preview');
    setCanonical(canonical);
    setStructuredData(config, canonical);
  }, [view]);

  return null;
}
