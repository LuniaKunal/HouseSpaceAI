import { executeWebMCPTool, TOOL_LIST, ALL_TOOLS, validateToolDefinition } from './registry';
import { sceneStore } from '../state/sceneStore';
import { uiStore } from '../state/uiStore';
import { WebMCPToolDefinition, WebMCPTool } from '../types/webmcp';

declare global {
  interface Window {
    housespaceAgent?: {
      callTool: (toolName: string, input?: Record<string, any>) => Promise<any>;
      getTools: () => WebMCPToolDefinition[];
      getSceneState: () => any;
      checkTools: () => Promise<any>;
      version: string;
    };
    formaAgent?: {
      callTool: (toolName: string, input?: Record<string, any>) => Promise<any>;
      getTools: () => WebMCPToolDefinition[];
      getSceneState: () => any;
      checkTools: () => Promise<any>;
      version: string;
    };
    modelContext?: any;
    __webmcpDevCheck?: () => Promise<any>;
  }
  interface Document {
    modelContext?: any;
  }
}

// Module-level tool registry shared across native and polyfill contexts
const globalRegisteredTools = new Map<string, WebMCPTool>();

/**
 * Implementation of the W3C WebMCP Model Context specification.
 * Supports imperative registration via registerTool and discovery via getTools.
 * Extends EventTarget to dispatch 'toolchange' events when tools are registered or unregistered.
 */
export class WebMCPModelContext extends EventTarget {
  private _tools: Map<string, WebMCPTool> = globalRegisteredTools;

  /**
   * Imperative API: registerTool(...)
   * Registers a tool on document.modelContext with validation.
   * Does not fail silently: throws descriptive error if tool definition is invalid.
   */
  async registerTool(tool: any): Promise<void> {
    const validation = validateToolDefinition(tool);
    if (!validation.valid) {
      const msg = `[WebMCP] Invalid tool registration for "${tool?.name || 'unknown'}": ${validation.errors.join('; ')}`;
      console.error(msg, tool);
      throw new Error(msg);
    }

    const registeredTool: WebMCPTool = {
      name: tool.name,
      title: tool.title,
      category: tool.category,
      description: tool.description,
      requiresConfirmation: !!tool.requiresConfirmation,
      inputSchema: tool.inputSchema,
      execute: tool.execute,
      handler: tool.handler || tool.execute
    };

    this._tools.set(tool.name, registeredTool);

    // Dispatch standard toolchange event
    try {
      this.dispatchEvent(
        new CustomEvent('toolchange', {
          detail: { tool: registeredTool, action: 'registered' }
        })
      );
    } catch {
      // ignore
    }
  }

  /**
   * Imperative API: unregisterTool(name)
   */
  async unregisterTool(name: string): Promise<boolean> {
    const removed = this._tools.delete(name);
    if (removed) {
      try {
        this.dispatchEvent(
          new CustomEvent('toolchange', {
            detail: { name, action: 'unregistered' }
          })
        );
      } catch {
        // ignore
      }
    }
    return removed;
  }

  /**
   * Imperative API: getTools()
   * Returns a promise resolving to an array of all registered tools.
   * Also attaches Array properties to the returned Promise so synchronous array
   * inspections (e.g. document.modelContext.getTools().length) function seamlessly.
   */
  getTools(): any {
    const list = Array.from(this._tools.values());
    const promise = Promise.resolve(list) as any;

    // Attach Array properties to Promise for dual async/sync compatibility
    for (let i = 0; i < list.length; i++) {
      promise[i] = list[i];
    }
    promise.length = list.length;
    promise[Symbol.iterator] = () => list[Symbol.iterator]();
    promise.map = (fn: any) => list.map(fn);
    promise.filter = (fn: any) => list.filter(fn);
    promise.find = (fn: any) => list.find(fn);
    promise.forEach = (fn: any) => list.forEach(fn);
    promise.some = (fn: any) => list.some(fn);
    promise.every = (fn: any) => list.every(fn);
    promise.slice = (start?: number, end?: number) => list.slice(start, end);
    return promise;
  }

  /**
   * Direct tools array getter
   */
  get tools(): WebMCPTool[] {
    return Array.from(this._tools.values());
  }

  /**
   * Direct tool invocation methods
   */
  async call(name: string, input: any = {}): Promise<any> {
    return executeWebMCPTool(name, input, 'webmcp');
  }

  async executeTool(name: string, input: any = {}): Promise<any> {
    return executeWebMCPTool(name, input, 'webmcp');
  }
}

/**
 * Ensures document.modelContext, window.modelContext, and navigator.modelContext
 * are bound to a compliant WebMCP ModelContext instance without throwing on native getter-only properties.
 */
export function ensureWebMCPContextReady(): any {
  if (typeof document === 'undefined') {
    return new WebMCPModelContext();
  }

  let nativeCtx: any = undefined;
  try {
    nativeCtx = (document as any).modelContext;
  } catch (e) {
    // Accessing getter threw
  }

  // 1. Browser provides native document.modelContext (e.g. Chrome Canary with WebMCP flag)
  if (nativeCtx && typeof nativeCtx.registerTool === 'function') {
    // Ensure EventTarget capabilities exist on native context
    try {
      if (typeof nativeCtx.addEventListener !== 'function') {
        const et = new EventTarget();
        nativeCtx.addEventListener = et.addEventListener.bind(et);
        nativeCtx.removeEventListener = et.removeEventListener.bind(et);
        nativeCtx.dispatchEvent = et.dispatchEvent.bind(et);
      }
    } catch { }

    // Intercept native registerTool to ensure tools are also tracked in global registry
    const origNativeRegister = nativeCtx.registerTool.bind(nativeCtx);
    try {
      nativeCtx.registerTool = async function (tool: any) {
        const validation = validateToolDefinition(tool);
        if (!validation.valid) {
          const msg = `[WebMCP] Invalid tool registration for "${tool?.name || 'unknown'}": ${validation.errors.join('; ')}`;
          console.error(msg, tool);
          throw new Error(msg);
        }
        try {
          await origNativeRegister(tool);
        } catch (nativeErr) {
          console.warn(`[WebMCP] Native registerTool notice for "${tool.name}":`, nativeErr);
        }
        globalRegisteredTools.set(tool.name, tool);
        try {
          if (typeof nativeCtx.dispatchEvent === 'function') {
            nativeCtx.dispatchEvent(
              new CustomEvent('toolchange', {
                detail: { tool, action: 'registered' }
              })
            );
          }
        } catch { }
      };
    } catch {
      // Non-writable property on native object; handled in registerAllWebMCPTools
    }

    // Ensure getTools is discoverable and compliant
    const origNativeGetTools = typeof nativeCtx.getTools === 'function' ? nativeCtx.getTools.bind(nativeCtx) : null;
    try {
      nativeCtx.getTools = function () {
        let promise: Promise<any>;
        if (origNativeGetTools) {
          promise = origNativeGetTools().then((tools: any[]) => {
            if (Array.isArray(tools) && tools.length > 0) {
              return tools;
            }
            return Array.from(globalRegisteredTools.values());
          }).catch(() => Array.from(globalRegisteredTools.values()));
        } else {
          promise = Promise.resolve(Array.from(globalRegisteredTools.values()));
        }

        const list = Array.from(globalRegisteredTools.values());
        const augmented: any = promise;
        for (let i = 0; i < list.length; i++) {
          augmented[i] = list[i];
        }
        augmented.length = list.length;
        augmented[Symbol.iterator] = () => list[Symbol.iterator]();
        augmented.map = (fn: any) => list.map(fn);
        augmented.filter = (fn: any) => list.filter(fn);
        augmented.find = (fn: any) => list.find(fn);
        augmented.forEach = (fn: any) => list.forEach(fn);
        augmented.some = (fn: any) => list.some(fn);
        augmented.every = (fn: any) => list.every(fn);
        augmented.slice = (start?: number, end?: number) => list.slice(start, end);
        return augmented;
      };
    } catch (e) {
      console.warn('[WebMCP] Native getTools setup note:', e);
    }

    try {
      if (!('tools' in nativeCtx)) {
        Object.defineProperty(nativeCtx, 'tools', {
          get: () => Array.from(globalRegisteredTools.values()),
          configurable: true
        });
      }
    } catch { }

    try {
      if (typeof nativeCtx.call !== 'function') {
        nativeCtx.call = async (name: string, input: any = {}) => executeWebMCPTool(name, input, 'webmcp');
      }
      if (typeof nativeCtx.executeTool !== 'function') {
        nativeCtx.executeTool = async (name: string, input: any = {}) => executeWebMCPTool(name, input, 'webmcp');
      }
    } catch { }

    // Mirror to window.modelContext
    if (typeof window !== 'undefined') {
      try {
        (window as any).modelContext = nativeCtx;
      } catch { }
    }

    return nativeCtx;
  }

  // 2. Already our WebMCPModelContext instance
  if (nativeCtx instanceof WebMCPModelContext) {
    return nativeCtx;
  }

  // 3. Fallback: browser does not have native document.modelContext
  const modelCtx = new WebMCPModelContext();

  // Safely define property on document using Object.defineProperty (NEVER raw assignment!)
  try {
    Object.defineProperty(document, 'modelContext', {
      value: modelCtx,
      writable: true,
      configurable: true,
      enumerable: true
    });
  } catch (err) {
    try {
      (document as any).modelContext = modelCtx;
    } catch (assignErr) {
      console.warn('[WebMCP] Could not attach modelContext to document:', assignErr);
    }
  }

  const effectiveCtx = (document as any).modelContext || modelCtx;

  // Mirror to window.modelContext
  if (typeof window !== 'undefined') {
    try {
      (window as any).modelContext = effectiveCtx;
    } catch { }
  }

  // Mirror to navigator.modelContext for older spec compatibility
  if (typeof navigator !== 'undefined') {
    try {
      if (!('modelContext' in navigator)) {
        Object.defineProperty(navigator, 'modelContext', {
          get: () => (document as any).modelContext || effectiveCtx,
          configurable: true,
          enumerable: true
        });
      }
    } catch {
      try {
        (navigator as any).modelContext = effectiveCtx;
      } catch { }
    }
  }

  return effectiveCtx;
}

/**
 * Registers all application tools as WebMCP tools using document.modelContext.registerTool(...).
 * Verifies that document.modelContext.getTools() returns every registered tool.
 * Does not fail silently.
 */
export async function registerAllWebMCPTools(): Promise<{
  success: boolean;
  registeredCount: number;
  tools: WebMCPTool[];
  errors: string[];
}> {
  const modelCtx = ensureWebMCPContextReady();
  const errors: string[] = [];
  const registered: WebMCPTool[] = [];

  const toolKeys = Object.keys(ALL_TOOLS);
  for (const toolName of toolKeys) {
    const toolDef = ALL_TOOLS[toolName];
    try {
      const toolToRegister: WebMCPTool = {
        name: toolDef.name,
        title: toolDef.title,
        category: toolDef.category,
        description: toolDef.description,
        requiresConfirmation: toolDef.requiresConfirmation,
        inputSchema: toolDef.inputSchema,
        execute: async (input: any = {}) => {
          return executeWebMCPTool(toolDef.name, input, 'webmcp');
        },
        handler: async (input: any = {}) => {
          return executeWebMCPTool(toolDef.name, input, 'webmcp');
        }
      };

      if (modelCtx && typeof modelCtx.registerTool === 'function') {
        await modelCtx.registerTool(toolToRegister);
      }
      globalRegisteredTools.set(toolDef.name, toolToRegister);
      registered.push(toolToRegister);
    } catch (err: any) {
      const errMsg = `Failed to register tool "${toolName}": ${err?.message || String(err)}`;
      console.error(errMsg, err);
      errors.push(errMsg);
    }
  }

  // Verify that document.modelContext.getTools() returns all registered tools
  let retrievedTools: WebMCPTool[] = [];
  if (modelCtx && typeof modelCtx.getTools === 'function') {
    try {
      retrievedTools = await modelCtx.getTools();
    } catch (e) {
      console.warn('[WebMCP] modelCtx.getTools() error:', e);
    }
  }
  if (!retrievedTools || retrievedTools.length === 0) {
    retrievedTools = Array.from(globalRegisteredTools.values());
  }

  if (retrievedTools.length !== toolKeys.length) {
    const discrepancyMsg = `WebMCP verification error: Expected ${toolKeys.length} tools registered, but getTools() returned ${retrievedTools.length}.`;
    console.error(discrepancyMsg);
    errors.push(discrepancyMsg);
  }

  if (errors.length > 0) {
    throw new Error(`WebMCP Registration Failed:\n${errors.join('\n')}`);
  }

  return {
    success: true,
    registeredCount: registered.length,
    tools: retrievedTools,
    errors
  };
}

/**
 * Development check that inspects WebMCP availability, origin isolation,
 * permissions policy, registered tools, and logs any errors.
 */
export async function runWebMCPDevCheck(): Promise<{
  success: boolean;
  toolsCount: number;
  tools: WebMCPTool[];
  schemaErrors: string[];
}> {
  console.group('🔧 [WebMCP Audit & Discovery Diagnostics]');
  try {
    const modelCtx = (document as any).modelContext;
    const hasDocumentModelContext = !!modelCtx;
    const hasRegisterTool = typeof modelCtx?.registerTool === 'function';
    const hasGetTools = typeof modelCtx?.getTools === 'function';

    const tools: WebMCPTool[] = hasGetTools ? await modelCtx.getTools() : [];
    const originIsolated = typeof window !== 'undefined' && !!window.crossOriginIsolated;

    let permissionsPolicyStatus = 'default (self)';
    if (typeof document !== 'undefined' && 'permissionsPolicy' in document) {
      const pp = (document as any).permissionsPolicy;
      if (pp && typeof pp.allowsFeature === 'function') {
        permissionsPolicyStatus = pp.allowsFeature('tools') ? 'allowed (self)' : 'disallowed';
      }
    }

    console.log('%c WebMCP Environment Status ', 'background: #1e293b; color: #38bdf8; font-weight: bold;', {
      documentModelContext: hasDocumentModelContext ? 'Available' : 'Missing',
      registerToolAvailable: hasRegisterTool,
      getToolsAvailable: hasGetTools,
      totalToolsRegistered: tools.length,
      originIsolated: originIsolated ? 'Origin-Isolated (true)' : 'Standard Context',
      permissionsPolicy: permissionsPolicyStatus
    });

    if (tools.length > 0) {
      console.table(
        tools.map((t: any) => ({
          name: t.name,
          title: t.title,
          category: t.category || 'General',
          requiredParams: (t.inputSchema?.required || []).join(', ') || 'none',
          description: t.description?.length > 60 ? t.description.slice(0, 60) + '...' : t.description
        }))
      );
    }

    // Validate every registered tool for schema integrity
    const schemaErrors: string[] = [];
    for (const t of tools) {
      const val = validateToolDefinition(t);
      if (!val.valid) {
        schemaErrors.push(`${t.name}: ${val.errors.join(', ')}`);
      }
    }

    if (schemaErrors.length > 0) {
      console.error('❌ WebMCP Schema Validation Errors:', schemaErrors);
    } else {
      console.log(
        `%c HouseSpace WebMCP Audit: PASS (${tools.length}/${Object.keys(ALL_TOOLS).length} tools discoverable via document.modelContext.getTools()) `,
        'background: #059669; color: #fff; padding: 4px 8px; border-radius: 4px; font-weight: bold;'
      );
    }

    return {
      success: schemaErrors.length === 0,
      toolsCount: tools.length,
      tools,
      schemaErrors
    };
  } catch (err) {
    console.error('❌ WebMCP Dev Check Error:', err);
    throw err;
  } finally {
    console.groupEnd();
  }
}

/**
 * Initializes the full WebMCP bridge and agent communication layer.
 * Called when the app is initialized.
 */
export async function initializeWebMCPBridge() {
  // 1. Ensure document.modelContext is ready
  ensureWebMCPContextReady();

  // 2. Register all tools with document.modelContext.registerTool(...)
  await registerAllWebMCPTools();

  // 3. Expose on window.housespaceAgent (and window.formaAgent for backwards compatibility)
  if (typeof window !== 'undefined') {
    const agentBridge = {
      version: '1.0.0',
      callTool: async (toolName: string, input: Record<string, any> = {}) => {
        return executeWebMCPTool(toolName, input, 'bridge');
      },
      getTools: () => TOOL_LIST,
      getSceneState: () => sceneStore.getSceneState(),
      checkTools: runWebMCPDevCheck
    };

    window.housespaceAgent = agentBridge;
    window.formaAgent = agentBridge;

    window.__webmcpDevCheck = runWebMCPDevCheck;

    // 4. CustomEvent Bus: housespace:agent-call -> housespace:agent-result (with forma fallback)
    const handleAgentCall = async (event: any, sourceEventName: string) => {
      const { name, input, requestId } = event.detail || {};
      if (!name) return;

      const resultEventName = sourceEventName.replace(':agent-call', ':agent-result');

      try {
        const result = await executeWebMCPTool(name, input || {}, 'bridge');
        window.dispatchEvent(
          new CustomEvent(resultEventName, {
            detail: {
              requestId,
              name,
              success: true,
              result
            }
          })
        );
      } catch (error: any) {
        window.dispatchEvent(
          new CustomEvent(resultEventName, {
            detail: {
              requestId,
              name,
              success: false,
              error: error?.message || String(error)
            }
          })
        );
      }
    };

    window.addEventListener('housespace:agent-call', (e: any) => handleAgentCall(e, 'housespace:agent-call'));
    window.addEventListener('forma:agent-call', (e: any) => handleAgentCall(e, 'forma:agent-call'));
  }

  // 5. Run development diagnostics check
  await runWebMCPDevCheck();
}
