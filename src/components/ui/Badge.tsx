"use client";

import { getStatusColor } from "@/lib/formatters";

interface BadgeProps {
  status: string;
  label?: string;
}

export default function Badge({ status, label }: BadgeProps) {
  const colorClass = getStatusColor(status);
  return (
    <span className={`badge ${colorClass}`}>
      {label || status.replace(/_/g, " ")}
    </span>
  );
}
