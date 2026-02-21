"use client";

import ReactMarkdown from "react-markdown";
import { User, Bot, Wrench } from "lucide-react";
import { formatRelativeTime } from "@/lib/formatters";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  metadata?: { toolsUsed?: string[] };
  createdAt: string;
}

export default function ChatMessage({ role, content, metadata, createdAt }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`
        w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
        ${isUser ? "bg-primary-100" : "bg-gray-100"}
      `}>
        {isUser ? (
          <User className="w-4 h-4 text-primary-600" />
        ) : (
          <Bot className="w-4 h-4 text-gray-600" />
        )}
      </div>

      <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-[80%]`}>
        <div className={isUser ? "chat-bubble-user" : "chat-bubble-assistant"}>
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{content}</p>
          ) : (
            <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-code:text-primary-700 prose-code:bg-primary-50 prose-code:px-1 prose-code:rounded">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 mt-1 px-1">
          <span className="text-[10px] text-gray-400">{formatRelativeTime(createdAt)}</span>
          {metadata?.toolsUsed && metadata.toolsUsed.length > 0 && (
            <div className="flex items-center gap-1">
              <Wrench className="w-3 h-3 text-gray-300" />
              <span className="text-[10px] text-gray-400">
                {metadata.toolsUsed.join(", ")}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
