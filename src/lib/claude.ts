import Anthropic from "@anthropic-ai/sdk";

let clientInstance: Anthropic | null = null;

export function getClaudeClient(apiKey: string): Anthropic {
  if (!clientInstance || (clientInstance as unknown as Record<string, string>).apiKey !== apiKey) {
    clientInstance = new Anthropic({ apiKey });
  }
  return clientInstance;
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface ClaudeChatOptions {
  apiKey: string;
  model: string;
  temperature: number;
  systemPrompt: string;
  messages: { role: "user" | "assistant"; content: string | unknown[] }[];
  tools?: ToolDefinition[];
  maxTokens?: number;
}

export async function chatWithClaude(options: ClaudeChatOptions) {
  const client = getClaudeClient(options.apiKey);

  const response = await client.messages.create({
    model: options.model,
    max_tokens: options.maxTokens || 4096,
    temperature: options.temperature,
    system: options.systemPrompt,
    messages: options.messages as Anthropic.MessageParam[],
    tools: options.tools as Anthropic.Tool[],
  });

  return response;
}
