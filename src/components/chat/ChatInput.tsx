"use client";

import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
}

export default function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + "px";
    }
  }, [input]);

  function handleSubmit() {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      <div className="flex items-end gap-2 max-w-3xl mx-auto">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your finances..."
          className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          rows={1}
          disabled={isLoading}
        />
        <button
          onClick={handleSubmit}
          disabled={!input.trim() || isLoading}
          className="p-3 rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
      <p className="text-[10px] text-gray-400 text-center mt-2">
        Shift+Enter for new line. AI responses are for informational purposes only.
      </p>
    </div>
  );
}
