import React, { useState } from 'react';
import { uiStore } from '../../state/uiStore';
import {
  Sparkles,
  Bot,
  BrainCircuit,
  Compass,
  Layers,
  Wand2,
  CheckCircle2,
  Bell,
  Clock,
  Send,
  ShieldCheck,
  Cpu,
  Palette,
  Maximize2,
  ArrowRight
} from 'lucide-react';

export const AgentCopilotPanel: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<'overview' | 'features' | 'roadmap'>('overview');

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      uiStore.addToast('Invalid Email', 'Please enter a valid email address to join the waitlist.', 'error');
      return;
    }

    setIsSubscribed(true);
    uiStore.addToast(
      'Priority Access Confirmed',
      `Thank you! ${email} has been added to the AI Co-Designer early preview list.`,
      'success'
    );
  };

  const upcomingFeatures = [
    {
      icon: Compass,
      title: 'Autonomous Spatial Planning',
      desc: 'Automatic room layout generation with circulation clearance, doorway alignment, and spatial ergonomics.',
      tag: 'Spatial AI',
      color: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-400'
    },
    {
      icon: Wand2,
      title: 'Intelligent Furniture Styling',
      desc: 'Context-aware furniture arrangement solver adhering to wall offsets, window positions, and design themes.',
      tag: 'Interior Solver',
      color: 'from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-400'
    },
    {
      icon: Palette,
      title: 'Curated PBR Finishes & Palettes',
      desc: 'Dynamic color theory, material coordination (Carrara marble, oak hardwood), and photorealistic render styles.',
      tag: 'Aesthetic Engine',
      color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400'
    },
    {
      icon: Layers,
      title: 'Multimodal Blueprint Synthesis',
      desc: 'Synthesize raw architectural CAD drawings and sketches into fully furnished, editable 3D structures.',
      tag: 'Vision & BIM',
      color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400'
    }
  ];

  const milestones = [
    { phase: 'Phase 1', title: 'WebMCP Open Tool Protocol', status: 'Completed', detail: '50 deterministic spatial manipulation tools on live scene graph.' },
    { phase: 'Phase 2', title: 'Multimodal Spatial Reasoning Model', status: 'In Training', detail: 'Fine-tuning architectural LLM on interior layouts and ergonomics.' },
    { phase: 'Phase 3', title: 'Human-in-the-Loop Co-Creation', status: 'Upcoming', detail: 'Real-time collaborative suggestions with interactive approvals.' },
    { phase: 'Phase 4', title: 'Studio Early Access Beta', status: 'Coming Soon', detail: 'Private beta rollout for HouseSpace designers and architects.' }
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-studio-panel select-none">
      {/* Copilot Header */}
      <div className="p-3.5 border-b border-white/[0.08] bg-studio-surface/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-glow-blue">
            <Sparkles size={16} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-white">AI Co-Designer</h3>
            </div>
            <p className="text-[10px] text-slate-400">Autonomous Spatial Intelligence</p>
          </div>
        </div>

        <span className="flex items-center gap-1.5 text-[10px] text-amber-300 font-mono uppercase tracking-wider bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
          <span className="size-1.5 rounded-full bg-amber-400 animate-ping" />
          Coming Soon
        </span>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center border-b border-white/[0.08] bg-studio-canvas/60 px-3 py-1.5 gap-1 shrink-0">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'features', label: 'Capabilities' },
          { id: 'roadmap', label: 'Roadmap' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActivePreviewTab(tab.id as any)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
              activePreviewTab === tab.id
                ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-studio-surface'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activePreviewTab === 'overview' && (
          <>
            {/* Hero Card */}
            <div className="relative rounded-2xl p-4 overflow-hidden border border-white/[0.1] bg-gradient-to-br from-blue-950/40 via-indigo-950/30 to-purple-950/20 backdrop-blur-sm">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 size-24 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-center gap-2 mb-2">
                <div className="size-7 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
                  <BrainCircuit size={15} />
                </div>
                <span className="text-[11px] font-semibold text-blue-300 uppercase tracking-wider font-mono">
                  Autonomous Studio Agent
                </span>
              </div>

              <h4 className="text-sm font-bold text-white mb-1.5 leading-snug">
                Your Intelligent Architectural Partner
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed text-pretty">
                We are building a foundational spatial intelligence model that understands architectural floor plans, spatial circulation, and interior ergonomics.
              </p>

              <div className="mt-3 pt-3 border-t border-white/[0.08] flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Status</span>
                <span className="flex items-center gap-1.5 text-amber-300 font-medium">
                  <Clock size={12} /> Model Training & Safety Alignment
                </span>
              </div>
            </div>

            {/* Quick Feature Highlights */}
            <div className="space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                What AI Co-Designer Will Do
              </div>
              <div className="grid grid-cols-1 gap-2">
                {upcomingFeatures.slice(0, 2).map((feat, idx) => {
                  const Icon = feat.icon;
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-studio-surface/80 border border-white/[0.08] flex items-start gap-3"
                    >
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${feat.color} border shrink-0 mt-0.5`}>
                        <Icon size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-semibold text-white">{feat.title}</span>
                          <span className="text-[9px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-studio-card border border-white/[0.06]">
                            {feat.tag}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed text-pretty">{feat.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Early Access Notification Form */}
            <div className="rounded-2xl p-4 bg-studio-surface border border-white/[0.08] space-y-3">
              <div className="flex items-center gap-2">
                <Bell size={15} className="text-blue-400" />
                <h5 className="text-xs font-semibold text-white">Join Early Access Waitlist</h5>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Be the first to test autonomous room generation, style transfers, and voice-assisted layout optimization.
              </p>

              {isSubscribed ? (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center gap-2.5 text-emerald-300 text-xs">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span>You are registered for early access! We will notify you when beta opens.</span>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="space-y-2">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="architect@studio.com"
                    className="w-full bg-studio-canvas border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500/80 focus-ring font-medium transition"
                  />
                  <button
                    type="submit"
                    className="w-full py-2 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition shadow-glow-blue active:scale-[0.98]"
                  >
                    <span>Request Early Access</span>
                    <ArrowRight size={13} />
                  </button>
                </form>
              )}
            </div>
          </>
        )}

        {activePreviewTab === 'features' && (
          <div className="space-y-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Planned Autonomous Capabilities
            </div>
            {upcomingFeatures.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-studio-surface border border-white/[0.08] space-y-2"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${feat.color} border shrink-0`}>
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white">{feat.title}</div>
                      <span className="text-[9px] font-mono text-blue-400">{feat.tag}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">{feat.desc}</p>
                </div>
              );
            })}
          </div>
        )}

        {activePreviewTab === 'roadmap' && (
          <div className="space-y-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Development Milestones
            </div>
            <div className="relative pl-4 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-white/[0.08]">
              {milestones.map((m, idx) => {
                const isCompleted = m.status === 'Completed';
                const isInProgress = m.status === 'In Training';
                return (
                  <div key={idx} className="relative space-y-1">
                    <div
                      className={`absolute -left-4 top-1 size-2 rounded-full ring-4 ring-studio-panel ${
                        isCompleted
                          ? 'bg-emerald-400'
                          : isInProgress
                          ? 'bg-amber-400 animate-ping'
                          : 'bg-slate-600'
                      }`}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400">{m.phase}</span>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                          isCompleted
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : isInProgress
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : 'bg-studio-card text-slate-400 border border-white/[0.06]'
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-white">{m.title}</div>
                    <p className="text-[11px] text-slate-300 leading-relaxed text-pretty">{m.detail}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-white/[0.08] bg-studio-surface/90 text-center shrink-0">
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-mono">
          <ShieldCheck size={12} className="text-emerald-400" />
          <span>WebMCP Open Tool Protocol Compatible</span>
        </div>
      </div>
    </div>
  );
};
