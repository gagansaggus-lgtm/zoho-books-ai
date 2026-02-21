"use client";

import { useState, useEffect, useRef } from "react";
import { useToast } from "@/components/ui/Toast";
import { chatApi } from "@/lib/api";
import ChatMessage from "@/components/chat/ChatMessage";
import ChatInput from "@/components/chat/ChatInput";
import ChatHistory from "@/components/chat/ChatHistory";
import SuggestedQueries from "@/components/chat/SuggestedQueries";
import { BookOpen, History, X } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  metadata?: { toolsUsed?: string[] };
  createdAt: string;
}

interface ConversationItem {
  id: string;
  title: string;
  updatedAt: string;
  messages: { content: string }[];
}

export default function ChatPage() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadHistory() {
    try {
      const data = await chatApi.history();
      if (data && typeof data === "object" && "conversations" in data) {
        setConversations((data as { conversations: ConversationItem[] }).conversations);
      }
    } catch {
      // Silently fail - history is not critical
    }
  }

  async function loadConversation(id: string) {
    try {
      const res = await fetch(`/api/chat/history?conversationId=${id}`);
      const data = await res.json();
      if (data.conversations?.[0]?.messages) {
        // Load full conversation messages
      }
      setConversationId(id);
      setShowHistory(false);
    } catch {
      toast.error("Failed to load conversation");
    }
  }

  function startNewChat() {
    setMessages([]);
    setConversationId(undefined);
    setShowHistory(false);
  }

  async function handleSend(message: string) {
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: message,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await chatApi.send({
        conversationId,
        message,
      });

      setConversationId(response.conversationId);

      const assistantMessage: Message = {
        id: `resp-${Date.now()}`,
        role: "assistant",
        content: response.message,
        metadata: response.metadata as { toolsUsed?: string[] },
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Refresh history
      loadHistory();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send message");
      // Remove the user message on error
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="h-[calc(100vh-2rem)] md:h-[calc(100vh-3rem)] lg:h-[calc(100vh-4rem)] flex flex-col -m-4 md:-m-6 lg:-m-8">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-primary-600" />
          <div>
            <h1 className="text-lg font-semibold text-gray-900">AI Bookkeeper Chat</h1>
            <p className="text-[11px] text-gray-500">Ask questions about your Zoho Books data</p>
          </div>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="btn-ghost text-sm"
        >
          {showHistory ? <X className="w-4 h-4" /> : <History className="w-4 h-4" />}
          {showHistory ? "Close" : "History"}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* History Sidebar */}
        {showHistory && (
          <div className="w-72 border-r border-gray-200 bg-white">
            <ChatHistory
              conversations={conversations}
              activeId={conversationId}
              onSelect={loadConversation}
              onNew={startNewChat}
            />
          </div>
        )}

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="p-4 bg-primary-50 rounded-full mb-4">
                  <BookOpen className="w-8 h-8 text-primary-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Welcome to AI Bookkeeper</h2>
                <p className="text-sm text-gray-500 mt-2 max-w-md">
                  Ask me anything about your finances. I can look up invoices, analyze expenses,
                  check cash flow, and more.
                </p>
                <div className="mt-6 w-full max-w-lg">
                  <SuggestedQueries onSelect={handleSend} />
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-w-3xl mx-auto">
                {messages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    role={msg.role}
                    content={msg.content}
                    metadata={msg.metadata}
                    createdAt={msg.createdAt}
                  />
                ))}
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="chat-bubble-assistant">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-gray-400 typing-dot" />
                        <div className="w-2 h-2 rounded-full bg-gray-400 typing-dot" />
                        <div className="w-2 h-2 rounded-full bg-gray-400 typing-dot" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Suggested queries (when there are messages) */}
          {messages.length > 0 && !isLoading && (
            <div className="border-t border-gray-100">
              <SuggestedQueries onSelect={handleSend} />
            </div>
          )}

          {/* Input */}
          <ChatInput onSend={handleSend} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
