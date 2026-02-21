export interface ChatMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: {
    toolsUsed?: string[];
    model?: string;
    tokens?: { input_tokens: number; output_tokens: number };
  };
  createdAt: string;
}

export interface ChatConversation {
  id: string;
  title: string;
  summary: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatRequest {
  conversationId?: string;
  message: string;
}

export interface ChatResponse {
  conversationId: string;
  message: string;
  metadata: {
    toolsUsed: string[];
  };
}
