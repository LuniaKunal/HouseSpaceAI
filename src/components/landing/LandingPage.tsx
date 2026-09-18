import React from 'react';
import {
  ArrowRight,
  Box,
  Compass,
  MousePointer2,
  MoveUpRight,
  Share2,
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
  const trySample = async () => {
    const { projectStore } = await import('../../state/projectStore');
    await projectStore.load3BHKSampleProject();
  };

  const shareHouseSpace = async () => {
    const shareData = {
      title: 'HouseSpace',
      text: 'Plan and walk through a home design for free with HouseSpace.',
      url: window.location.origin
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(shareData.url);
      uiStore.showToast('Link copied', 'Share HouseSpace with someone planning a home.', 'success');
    } catch {
      // Cancelling a native share sheet is expected and should stay quiet.
    }
  };

  return (
    <div className="landing-page">
      <a href="#landing-main" className="skip-link">Skip to content</a>

      <MarketingNav current="home" />

      <main id="landing-main">
        <section className="landing-hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="hero-kicker">A free home planning studio for your next move, remodel, or daydream.</p>
            <h1 id="hero-title">See your home<br />before you build it.</h1>
            <p className="hero-summary">
              Start with a furnished three bedroom sample, reshape every room, and walk through the result in 3D.
            </p>
            <div className="hero-actions">
              <button className="primary-cta" onClick={trySample}>
                Try the furnished 3BHK <MoveUpRight size={18} />
              </button>
              <button className="text-cta" onClick={() => uiStore.setActiveView('dashboard')}>Start a blank plan <ArrowRight size={15} /></button>
            </div>
            <p className="hero-proof">Free to try. No account, card, or setup needed.</p>
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
          <p>See it before you commit.</p>
          <h2>Make one change, then feel the whole home shift around it.</h2>
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

        <section className="landing-steps" aria-labelledby="steps-title">
          <p>From sketch to walk through</p>
          <h2 id="steps-title">A home idea becomes easier to judge when you can move through it.</h2>
          <ol>
            <li><span>01</span><div><h3>Open a starting point</h3><p>Use the furnished 3BHK sample or begin with an empty plan.</p></div></li>
            <li><span>02</span><div><h3>Shape the rooms</h3><p>Adjust room sizes, openings, furniture, finishes, and clearances.</p></div></li>
            <li><span>03</span><div><h3>Walk it together</h3><p>Switch to 3D and first person view when a conversation needs a clearer answer.</p></div></li>
          </ol>
        </section>

        <section className="landing-faq" aria-labelledby="faq-title">
          <p>Questions, answered plainly.</p>
          <h2 id="faq-title">Start with a plan, not a blank page.</h2>
          <dl>
            <div><dt>Is HouseSpace free?</dt><dd>Yes. The current preview is free to use and does not ask for a card.</dd></div>
            <div><dt>Do I need design software experience?</dt><dd>No. Start with the sample, change one thing, and use the view that makes the next decision easiest.</dd></div>
            <div><dt>Can I plan a three bedroom home?</dt><dd>Yes. The furnished 3BHK sample is ready to open, edit, and walk through.</dd></div>
            <div><dt>Can I work from a floor plan?</dt><dd>Yes. You can build rooms from a plan and use measured dimensions while you work.</dd></div>
            <div><dt>Can I see the design in 3D?</dt><dd>Yes. Move between plan, orbit, and walk views without rebuilding the layout.</dd></div>
            <div><dt>Can I save my work?</dt><dd>Yes. Projects save in your browser and can be exported as a backup file.</dd></div>
          </dl>
        </section>

        <section className="landing-close">
          <div>
            <p>Your next home starts as a line.</p>
            <h2>Make the first move.</h2>
          </div>
          <div className="landing-close-actions">
            <button className="primary-cta light" onClick={trySample}>Try the 3BHK sample <ArrowRight size={18} /></button>
            <button className="share-cta" onClick={shareHouseSpace}>Share HouseSpace <Share2 size={17} /></button>
          </div>
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
