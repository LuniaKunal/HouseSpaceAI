import React from 'react';
import {
  ArrowRight,
  Box,
  Compass,
  MousePointer2,
  MoveUpRight,
  Sparkles,
  Waypoints
} from 'lucide-react';
import { uiStore } from '../../state/uiStore';
import { MarketingNav } from './MarketingNav';

const planRooms = [
  { name: 'Living', detail: '18′ × 14′', className: 'plan-room plan-living' },
  { name: 'Kitchen', detail: '12′ × 10′', className: 'plan-room plan-kitchen' },
  { name: 'Suite', detail: '15′ × 13′', className: 'plan-room plan-suite' },
  { name: 'Studio', detail: '11′ × 10′', className: 'plan-room plan-studio-room' },
  { name: 'Terrace', detail: 'Open air', className: 'plan-room plan-terrace' }
];

export const LandingPage: React.FC = () => {
  const enterStudio = () => uiStore.setActiveView('dashboard');

  return (
    <div className="landing-page">
      <a href="#landing-main" className="skip-link">Skip to content</a>

      <MarketingNav current="home" />

      <main id="landing-main">
        <section className="landing-hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="hero-kicker">A spatial design workspace for people who think in rooms.</p>
            <h1 id="hero-title">Plan a home<br />you can step into.</h1>
            <p className="hero-summary">
              Shape floor plans, furnish every room, and move from measured drawings to a walkable 3D home in one focused workspace.
            </p>
            <button className="primary-cta" onClick={enterStudio}>
              Enter the studio <MoveUpRight size={18} />
            </button>
            <p className="hero-proof">No setup needed · Includes a furnished 3BHK sample</p>
          </div>

          <div className="hero-plan-wrap" aria-label="Interactive architectural plan preview">
            <div className="plan-meta plan-meta-top"><span>HS–03</span><span>974.5 sq ft</span></div>
            <div className="floor-plan" aria-hidden="true">
              {planRooms.map(room => (
                <div key={room.name} className={room.className}>
                  <span>{room.name}</span><small>{room.detail}</small>
                </div>
              ))}
              <div className="plan-cursor"><MousePointer2 size={17} fill="currentColor" /><span>Living selected</span></div>
            </div>
            <div className="plan-meta plan-meta-bottom"><span>Ground floor</span><span>Scale 1:100</span></div>
          </div>
        </section>

        <section className="landing-statement" id="approach">
          <p>Design should move at the speed of a conversation.</p>
          <h2>Draw precisely. Adjust naturally. See every decision in context.</h2>
        </section>

        <section className="capability-story" id="capabilities" aria-label="Product capabilities">
          <article className="capability-main">
            <div className="capability-icon"><Waypoints size={25} /></div>
            <div>
              <h3>One plan, every perspective</h3>
              <p>Switch between measured plan, orbit, and first-person views without rebuilding your work.</p>
            </div>
            <div className="view-switcher" aria-hidden="true">
              <span className="active">Plan</span><span>Orbit</span><span>Walk</span>
            </div>
          </article>
          <article className="capability-note capability-measure">
            <Compass size={22} />
            <h3>Measurements stay visible</h3>
            <p>Dimensions, clearances, and room areas remain close to the decisions they affect.</p>
            <div className="dimension-line"><span>14′–6″</span></div>
          </article>
          <article className="capability-note capability-agent">
            <Sparkles size={22} />
            <h3>Built for collaboration</h3>
            <p>Make changes directly or let an AI design partner work through the same structured tools.</p>
            <div className="agent-command">“Give the dining table 3 feet of clearance.”</div>
          </article>
        </section>

        <section className="landing-close">
          <div>
            <p>Your next home starts as a line.</p>
            <h2>Make the first move.</h2>
          </div>
          <button className="primary-cta light" onClick={enterStudio}>Open your projects <ArrowRight size={18} /></button>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="brand-lockup"><span className="brand-mark"><Box size={18} /></span><span>HouseSpace</span></div>
        <p>Spatial planning for homes that feel right.</p>
        <span>© {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
};
