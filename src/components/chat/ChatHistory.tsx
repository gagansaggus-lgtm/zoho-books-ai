"use client";

import { MessageSquare, Plus } from "lucide-react";
import { formatRelativeTime } from "@/lib/formatters";

interface ConversationItem {
  id: string;
  title: string;
  updatedAt: string;
  messages: { content: string }[];
}

interface ChatHistoryProps {
  conversations: ConversationItem[];
  activeId?: string;
  onSelect: (id: string) => void;
  onNew: () => void;
}

export default function ChatHistory({ conversations, activeId, onSelect, onNew }: ChatHistoryProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-200">
        <button
          onClick={onNew}
          className="w-full btn-primary text-sm"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
        {conversations.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <MessageSquare className="w-6 h-6 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-400">No conversations yet</p>
          </div>
        ) : (
          <div className="space-y-0.5 px-2">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={`
                  w-full text-left px-3 py-2.5 rounded-lg transition-colors
                  ${activeId === conv.id
                    ? "bg-primary-50 text-primary-700"
                    : "text-gray-600 hover:bg-gray-50"
                  }
                `}
              >
                <div className="text-sm font-medium truncate">{conv.title}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  {formatRelativeTime(conv.updatedAt)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
