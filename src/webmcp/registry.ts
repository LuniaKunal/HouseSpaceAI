import { roomTools } from './tools/roomTools';
import { structureTools } from './tools/structureTools';
import { objectTools } from './tools/objectTools';
import { materialTools } from './tools/materialTools';
import { viewTools } from './tools/viewTools';
import { workflowTools } from './tools/workflowTools';
import { cadTools } from './tools/cadTools';
import { WebMCPToolDefinition } from '../types/webmcp';
import { agentStore } from '../state/agentStore';
import { uiStore } from '../state/uiStore';

export interface ExecutableTool extends WebMCPToolDefinition {
  execute: (input: any) => Promise<any>;
}

export const ALL_TOOLS: Record<string, ExecutableTool> = {
  ...roomTools,
  ...structureTools,
  ...objectTools,
  ...materialTools,
  ...viewTools,
  ...workflowTools,
  ...cadTools
};

export const TOOL_LIST: WebMCPToolDefinition[] = Object.values(ALL_TOOLS).map(t => ({
  name: t.name,
  title: t.title,
  category: t.category,
  description: t.description,
  requiresConfirmation: t.requiresConfirmation,
  inputSchema: t.inputSchema
}));

/**
 * Validates that a tool definition conforms to WebMCP specification
 * and valid JSON Schema standards. Throws error if invalid.
 */
export function validateToolDefinition(tool: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!tool) {
    return { valid: false, errors: ['Tool definition is null or undefined'] };
  }
  if (!tool.name || typeof tool.name !== 'string' || !tool.name.trim()) {
    errors.push('Tool must have a non-empty string "name"');
  }
  if (!tool.title || typeof tool.title !== 'string' || !tool.title.trim()) {
    errors.push(`Tool "${tool.name || 'unnamed'}" must have a meaningful non-empty "title"`);
  }
  if (!tool.description || typeof tool.description !== 'string' || !tool.description.trim()) {
    errors.push(`Tool "${tool.name || 'unnamed'}" must have a non-empty string "description"`);
  }
  if (!tool.inputSchema || typeof tool.inputSchema !== 'object') {
    errors.push(`Tool "${tool.name || 'unnamed'}" must have an "inputSchema" object`);
  } else {
    if (tool.inputSchema.type !== 'object') {
      errors.push(`Tool "${tool.name || 'unnamed'}" inputSchema.type must be "object"`);
    }
    if (tool.inputSchema.properties && typeof tool.inputSchema.properties !== 'object') {
      errors.push(`Tool "${tool.name || 'unnamed'}" inputSchema.properties must be an object`);
    }
    if (tool.inputSchema.required) {
      if (!Array.isArray(tool.inputSchema.required)) {
        errors.push(`Tool "${tool.name || 'unnamed'}" inputSchema.required must be an array of strings`);
      } else {
        const props = tool.inputSchema.properties || {};
        for (const reqKey of tool.inputSchema.required) {
          if (!(reqKey in props)) {
            errors.push(`Tool "${tool.name || 'unnamed'}" required field "${reqKey}" is not defined in properties`);
          }
        }
      }
    }
  }
  if (typeof tool.execute !== 'function') {
    errors.push(`Tool "${tool.name || 'unnamed'}" must have a working "execute" function`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Execute any WebMCP tool by name with parameter validation,
 * confirmation boundary check, and telemetry logging.
 */
export async function executeWebMCPTool(
  toolName: string,
  input: Record<string, any> = {},
  caller: 'webmcp' | 'bridge' | 'copilot' | 'user' = 'webmcp'
): Promise<any> {
  const tool = ALL_TOOLS[toolName];
  if (!tool) {
    const errorMsg = `Tool "${toolName}" not found. Available tools: ${Object.keys(ALL_TOOLS).join(', ')}`;
    agentStore.addLog({
      toolName,
      input,
      error: errorMsg,
      status: 'failed',
      caller
    });
    throw new Error(errorMsg);
  }

  const agentState = agentStore.getState();
  const needsConfirmation =
    tool.requiresConfirmation &&
    agentState.requireConfirmation &&
    !agentState.allowedActions.includes(toolName) &&
    caller !== 'user';

  if (needsConfirmation) {
    const logEntry = agentStore.addLog({
      toolName,
      input,
      status: 'pending',
      caller
    });

    const approved = await new Promise<boolean>(resolve => {
      uiStore.requestConfirmation({
        id: `conf-${Date.now()}`,
        toolName,
        input,
        description: `Agent requested permission to execute "${toolName}". This will modify or export structural project assets.`,
        timestamp: Date.now(),
        resolve: (isApproved: boolean) => {
          uiStore.clearConfirmation();
          resolve(isApproved);
        }
      });
    });

    if (!approved) {
      agentStore.updateLog(logEntry.id, {
        status: 'rejected',
        error: 'Rejected by user in confirmation gate'
      });
      throw new Error(`Tool execution for "${toolName}" was rejected by the human designer.`);
    }
  }

  const logEntry = agentStore.addLog({
    toolName,
    input,
    status: 'pending',
    caller
  });

  try {
    const result = await tool.execute(input);
    agentStore.updateLog(logEntry.id, {
      status: 'success',
      result
    });
    return result;
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    agentStore.updateLog(logEntry.id, {
      status: 'failed',
      error: errorMsg
    });
    throw err;
  }
}
