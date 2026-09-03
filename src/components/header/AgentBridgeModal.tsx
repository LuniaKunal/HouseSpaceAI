import React, { useState } from 'react';
import { TOOL_LIST, executeWebMCPTool } from '../../webmcp/registry';
import { agentStore } from '../../state/agentStore';
import { sceneStore } from '../../state/sceneStore';
import { uiStore } from '../../state/uiStore';
import {
  X,
  Bot,
  Copy,
  Check,
  Play,
  Terminal,
  Layers,
  Cpu,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

interface AgentBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AgentBridgeModal: React.FC<AgentBridgeModalProps> = ({ isOpen, onClose }) => {
  const [copiedTab, setCopiedTab] = useState<string | null>(null);
  const [selectedToolName, setSelectedToolName] = useState<string>('get_scene_state');
  const [toolInputJson, setToolInputJson] = useState<string>('{\n  "includeFurniture": true\n}');
  const [executionResult, setExecutionResult] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'tools' | 'playground' | 'integration' | 'prompts'>('tools');

  if (!isOpen) return null;

  const agentState = agentStore.getState();
  const selectedTool = TOOL_LIST.find(t => t.name === selectedToolName);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTab(label);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  const handleSelectTool = (toolName: string) => {
    setSelectedToolName(toolName);
    const tool = TOOL_LIST.find(t => t.name === toolName);
    if (tool) {
      const defaultArgs: Record<string, any> = {};
      if (tool.inputSchema.properties) {
        Object.entries(tool.inputSchema.properties).forEach(([key, val]: [string, any]) => {
          if (val.type === 'object') defaultArgs[key] = { x: 0, y: 0, z: 0 };
          else if (val.type === 'number') defaultArgs[key] = 10;
          else if (val.type === 'boolean') defaultArgs[key] = true;
          else if (val.enum && val.enum.length) defaultArgs[key] = val.enum[0];
          else defaultArgs[key] = 'example';
        });
      }
      if (toolName === 'create_room') {
        setToolInputJson(JSON.stringify({ name: 'Cozy Study', width: 12, depth: 10 }, null, 2));
      } else if (toolName === 'connect_rooms') {
        const rooms = sceneStore.getData().rooms;
        const r1 = rooms[0]?.id || 'room-1';
        const r2 = rooms[1]?.id || 'room-2';
        setToolInputJson(JSON.stringify({ roomIdA: r1, roomIdB: r2, wallDirection: 'right', openingWidth: 4 }, null, 2));
      } else if (toolName === 'add_connected_room') {
        const r1 = sceneStore.getData().rooms[0]?.id || 'room-1';
        setToolInputJson(JSON.stringify({ referenceRoomId: r1, direction: 'right', name: 'Connected Suite', width: 12, depth: 12, openingWidth: 4 }, null, 2));
      } else if (toolName === 'disconnect_rooms') {
        const gate = sceneStore.getData().gates[0];
        setToolInputJson(JSON.stringify({ gateId: gate?.id || 'gate-1', roomIdA: gate?.roomIdA || 'room-1', roomIdB: gate?.roomIdB || 'room-2' }, null, 2));
      } else if (toolName === 'add_furniture') {
        setToolInputJson(JSON.stringify({ type: 'sofa_3seater', position: { x: 2, y: 0, z: 2 } }, null, 2));
      } else if (toolName === 'move_object') {
        setToolInputJson(JSON.stringify({ objectId: 'obj-sofa-sectional-01', position: { x: -3, y: 0, z: 3 } }, null, 2));
      } else if (toolName === 'switch_view') {
        setToolInputJson(JSON.stringify({ mode: '2d', angle: 'top' }, null, 2));
      } else {
        setToolInputJson(JSON.stringify(defaultArgs, null, 2));
      }
    }
  };

  const handleExecuteTool = async () => {
    setIsExecuting(true);
    setExecutionResult(null);
    try {
      const parsedInput = toolInputJson.trim() ? JSON.parse(toolInputJson) : {};
      const res = await executeWebMCPTool(selectedToolName, parsedInput, 'bridge');
      setExecutionResult(JSON.stringify(res, null, 2));
      uiStore.addToast(`Tool Success: ${selectedToolName}`, 'Executed cleanly via WebMCP bridge', 'success');
    } catch (err: any) {
      setExecutionResult(JSON.stringify({ error: err.message || String(err) }, null, 2));
      uiStore.addToast(`Tool Error: ${selectedToolName}`, err.message, 'error');
    } finally {
      setIsExecuting(false);
    }
  };

  const starterPrompt = `You are HouseSpace's AI Co-Designer agent. You share the exact same 3D room canvas and state as the human designer.
You have access to ${TOOL_LIST.length} WebMCP tools to inspect, create, modify, and style rooms, furniture, and structure.
Canonical unit: FEET. All positions are {x, y, z} in feet.
Always start by calling \`get_scene_state({ includeFurniture: true })\` to inspect the layout before making changes.
When placing furniture, respect room boundaries and existing objects.`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] glass-popover rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in-scale">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-studio-surface/80">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-glow-blue shrink-0">
              <Bot size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white">WebMCP Agent Bridge & Studio Telemetry</h2>
                <span className="bg-emerald-500/15 text-emerald-300 text-[11px] px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-mono tabular-nums">
                  Connected &bull; {TOOL_LIST.length} Tools
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Shared state parity between human UI affordances and autonomous LLM agents
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-studio-surface transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-white/[0.08] bg-studio-canvas">
          {[
            { id: 'tools', label: `Registered Tools (${TOOL_LIST.length})`, icon: Layers },
            { id: 'playground', label: 'Live Tool Runner', icon: Terminal },
            { id: 'integration', label: 'Host Integration', icon: Cpu },
            { id: 'prompts', label: 'Starter Prompts', icon: Sparkles }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition active:scale-95 ${
                  isActive
                    ? 'border-blue-500 text-blue-400 bg-blue-500/10 rounded-t-xl'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Tab 1: Tools Catalog */}
          {activeTab === 'tools' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>All {TOOL_LIST.length} tools are registered natively on <code className="text-blue-400 font-mono">document.modelContext</code> & <code className="text-blue-400 font-mono">window.housespaceAgent</code></span>
                <span className="font-mono tabular-nums text-emerald-400">{TOOL_LIST.length} tools active</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {TOOL_LIST.map(tool => (
                  <div
                    key={tool.name}
                    className="p-3 bg-studio-surface border border-white/[0.08] rounded-xl hover:border-blue-500/50 transition cursor-pointer group active:scale-[0.99]"
                    onClick={() => {
                      handleSelectTool(tool.name);
                      setActiveTab('playground');
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <div className="text-xs font-semibold text-white group-hover:text-blue-300 transition">{tool.title}</div>
                        <code className="text-[10px] font-mono text-blue-400">{tool.name}</code>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-studio-card text-slate-400 border border-white/[0.08]">
                        {tool.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed text-pretty">{tool.description}</p>
                    {tool.requiresConfirmation && (
                      <span className="inline-flex items-center gap-1 mt-2 text-[10px] text-amber-400">
                        <ShieldCheck size={11} /> Human confirmation required
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 2: Live Tool Runner */}
          {activeTab === 'playground' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Select WebMCP Tool</label>
                  <select
                    value={selectedToolName}
                    onChange={e => handleSelectTool(e.target.value)}
                    className="w-full bg-studio-canvas border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:border-blue-500/80 focus-ring transition"
                  >
                    {TOOL_LIST.map(t => (
                      <option key={t.name} value={t.name}>
                        {t.title} ({t.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Tool Input JSON (Feet Canonical Unit)</label>
                  <textarea
                    rows={8}
                    value={toolInputJson}
                    onChange={e => setToolInputJson(e.target.value)}
                    className="w-full bg-studio-canvas border border-white/[0.08] rounded-xl p-3 text-xs font-mono tabular-nums text-emerald-400 focus:border-blue-500/80 focus-ring leading-relaxed transition"
                  />
                </div>

                <button
                  onClick={handleExecuteTool}
                  disabled={isExecuting}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-glow-blue active:scale-[0.98]"
                >
                  {isExecuting ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                  Execute Tool on Shared Canvas
                </button>
              </div>

              <div className="space-y-3 flex flex-col">
                <label className="block text-xs font-medium text-slate-300">Tool Execution Result</label>
                <div className="flex-1 min-h-[220px] bg-studio-canvas border border-white/[0.08] rounded-xl p-3 font-mono tabular-nums text-xs text-slate-300 overflow-y-auto">
                  {executionResult ? (
                    <pre className="text-[11px] text-blue-300 whitespace-pre-wrap">{executionResult}</pre>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                      Ready to execute. Results will mutate canvas in real-time.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Integration Code */}
          {activeTab === 'integration' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-semibold text-white mb-1">1. WebMCP Native Host (document.modelContext)</h3>
                <div className="relative bg-[#11131a] border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-300">
                  <pre>{`const webmcp = await tab.capabilities.get('webmcp');
const tools = await webmcp.fetchTools();

// Query scene state
const state = await tools.call('get_scene_state', { includeFurniture: true });

// Move an object in real-time
await tools.call('move_object', {
  objectId: 'obj-sofa-sectional-01',
  position: { x: -2, y: 0, z: 1 }
});`}</pre>
                  <button
                    onClick={() => handleCopy(`const webmcp = await tab.capabilities.get('webmcp');\nconst tools = await webmcp.fetchTools();\nconst state = await tools.call('get_scene_state', { includeFurniture: true });`, 'webmcp')}
                    className="absolute top-2 right-2 p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                  >
                    {copiedTab === 'webmcp' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-white mb-1">2. Standard Browser Window Bridge (window.housespaceAgent)</h3>
                <div className="relative bg-[#11131a] border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-300">
                  <pre>{`// Call directly in browser console
await window.housespaceAgent.callTool('create_room', {
  name: 'Study',
  width: 10,
  depth: 12
});`}</pre>
                  <button
                    onClick={() => handleCopy(`await window.housespaceAgent.callTool('create_room', { name: 'Study', width: 10, depth: 12 });`, 'window')}
                    className="absolute top-2 right-2 p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                  >
                    {copiedTab === 'window' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-white mb-1">3. CustomEvent Bus (housespace:agent-call)</h3>
                <div className="relative bg-[#11131a] border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-300">
                  <pre>{`window.dispatchEvent(new CustomEvent('housespace:agent-call', {
  detail: {
    name: 'switch_view',
    input: { mode: '2d', angle: 'top' },
    requestId: 'req-01'
  }
}));`}</pre>
                  <button
                    onClick={() => handleCopy(`window.dispatchEvent(new CustomEvent('housespace:agent-call', { detail: { name: 'switch_view', input: { mode: '2d', angle: 'top' }, requestId: 'req-01' } }));`, 'event')}
                    className="absolute top-2 right-2 p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                  >
                    {copiedTab === 'event' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Starter Prompts */}
          {activeTab === 'prompts' && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-white">System Prompt for WebMCP Agents</span>
                  <button
                    onClick={() => handleCopy(starterPrompt, 'prompt')}
                    className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300"
                  >
                    {copiedTab === 'prompt' ? <Check size={13} /> : <Copy size={13} />}
                    {copiedTab === 'prompt' ? 'Copied' : 'Copy System Prompt'}
                  </button>
                </div>
                <textarea
                  readOnly
                  rows={6}
                  value={starterPrompt}
                  className="w-full bg-[#11131a] border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-300 leading-relaxed"
                />
              </div>

              <div className="p-4 bg-blue-950/30 border border-blue-900/50 rounded-lg text-xs text-blue-200">
                <span className="font-semibold">Designed for OpenAI & WebMCP Hackathon:</span> HouseSpace allows an autonomous agent to redesign any room, add partitions, swap materials, and rotate furniture in real time while a human user watches and collaborates on the same page.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-[#161924] flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span>Total Calls: <strong className="text-white font-mono">{agentState.totalToolCalls}</strong></span>
            <span>&bull;</span>
            <span>Confirmation Policy: <strong className="text-amber-400">{agentState.requireConfirmation ? 'Active' : 'Off'}</strong></span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs transition"
          >
            Close Bridge Console
          </button>
        </div>
      </div>
    </div>
  );
};
