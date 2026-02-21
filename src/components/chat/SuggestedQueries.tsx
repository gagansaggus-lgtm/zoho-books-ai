"use client";

import { SUGGESTED_QUERIES } from "@/lib/constants";
import { Sparkles } from "lucide-react";

interface SuggestedQueriesProps {
  onSelect: (query: string) => void;
}

export default function SuggestedQueries({ onSelect }: SuggestedQueriesProps) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-3 h-3 text-primary-500" />
        <span className="text-xs text-gray-500 font-medium">Suggested questions</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {SUGGESTED_QUERIES.map((query) => (
          <button
            key={query}
            onClick={() => onSelect(query)}
            className="px-3 py-1.5 text-xs rounded-full border border-gray-200 text-gray-600 hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700 transition-colors"
          >
            {query}
          </button>
        ))}
      </div>
    </div>
  );
}
