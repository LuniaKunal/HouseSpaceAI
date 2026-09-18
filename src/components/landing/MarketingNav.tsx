import React from 'react';
import { ArrowRight, Box } from 'lucide-react';
import { ActiveView, uiStore } from '../../state/uiStore';

interface MarketingNavProps {
  current: 'home' | 'pricing';
}

const navigate = (event: React.MouseEvent<HTMLAnchorElement>, view: ActiveView) => {
  event.preventDefault();
  uiStore.setActiveView(view);
};

export const MarketingNav: React.FC<MarketingNavProps> = ({ current }) => (
  <header className="landing-nav">
    <a href="/" className="brand-lockup" onClick={event => navigate(event, 'landing')} aria-label="HouseSpace home">
      <span className="brand-mark" aria-hidden="true"><Box size={19} strokeWidth={1.8} /></span>
      <span>HouseSpace</span>
    </a>
    <nav aria-label="Main navigation">
      {current === 'home' ? <a href="#capabilities">Capabilities</a> : <a href="/" onClick={event => navigate(event, 'landing')}>Home</a>}
      <a href="/pricing" className={current === 'pricing' ? 'active' : ''} onClick={event => navigate(event, 'pricing')}>Pricing</a>
      <a href="/photos" onClick={event => navigate(event, 'photos')}>Photo design</a>
      <a className="nav-cta" href="/projects" onClick={event => navigate(event, 'dashboard')}>Open studio <ArrowRight size={15} /></a>
    </nav>
  </header>
);
