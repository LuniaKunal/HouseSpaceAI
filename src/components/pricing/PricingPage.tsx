import React from 'react';
import { ArrowRight, Check, Minus } from 'lucide-react';
import { MarketingNav } from '../landing/MarketingNav';
import { uiStore } from '../../state/uiStore';

const plans = [
  {
    name: 'Free',
    price: '$0',
    future: 'Free forever',
    audience: 'For homeowners and anyone testing an idea.',
    features: ['3 active home projects', '2D, 3D, and walk views', 'Full furniture catalogue', 'JSON and image exports']
  },
  {
    name: 'Studio',
    price: '$18',
    future: 'per month after preview',
    audience: 'For independent interior designers working with clients.',
    features: ['Unlimited active projects', 'CAD and BIM exports', 'AI layout assistance', 'Shareable client presentations']
  },
  {
    name: 'Practice',
    price: '$49',
    future: 'per seat / month after preview',
    audience: 'For small architecture and design teams.',
    features: ['Team project library', 'Roles and approvals', 'Shared material standards', 'Priority support and onboarding']
  }
];

export const PricingPage: React.FC = () => (
  <div className="pricing-page landing-page">
    <a href="#pricing-main" className="skip-link">Skip to pricing</a>
    <MarketingNav current="pricing" />

    <main id="pricing-main">
      <section className="pricing-intro">
        <p>Everything is open during preview</p>
        <h1>Start free. Pay only when HouseSpace earns a place in your practice.</h1>
        <div className="preview-note"><span>Preview access</span> Every feature is free to use today. No card, trial clock, or payment gate.</div>
      </section>

      <section className="pricing-plans" aria-label="HouseSpace plans">
        {plans.map((plan, index) => (
          <article key={plan.name} className={`pricing-plan ${index === 0 ? 'current' : 'future'}`}>
            <div className="plan-heading">
              <div>
                <h2>{plan.name}</h2>
                <p>{plan.audience}</p>
              </div>
              <span className="plan-index">0{index + 1}</span>
            </div>
            <div className="plan-price">
              <strong>{plan.price}</strong>
              <span>{plan.future}</span>
            </div>
            <ul>
              {plan.features.map(feature => <li key={feature}><Check size={16} /> {feature}</li>)}
            </ul>
            <button onClick={() => uiStore.setActiveView('dashboard')}>
              Use free during preview <ArrowRight size={16} />
            </button>
          </article>
        ))}
      </section>

      <section className="pricing-explainer">
        <div><Minus size={22} /><h2>How future pricing works</h2></div>
        <div className="pricing-copy">
          <p>The free plan stays useful for personal projects. Paid plans would fund heavier exports, AI compute, collaboration, and support—not access to your own designs.</p>
          <p>If pricing launches, preview users will get notice before anything changes. Existing projects stay accessible.</p>
        </div>
      </section>

      <section className="pricing-faq">
        <h2>Questions, answered plainly.</h2>
        <dl>
          <div><dt>Do I need a credit card?</dt><dd>No. HouseSpace is free during preview and there is no payment flow.</dd></div>
          <div><dt>Will my current projects become locked?</dt><dd>No. Your projects remain accessible if paid plans are introduced.</dd></div>
          <div><dt>Why show future prices now?</dt><dd>So the business model is transparent while the product is still free.</dd></div>
          <div><dt>Can a team use it today?</dt><dd>Yes. Preview access includes the current collaboration features at no cost.</dd></div>
        </dl>
      </section>
    </main>
  </div>
);
