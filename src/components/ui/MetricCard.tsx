"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: number;
  icon?: React.ReactNode;
  accentColor?: string;
}

export default function MetricCard({ title, value, subtitle, trend, icon, accentColor = "border-l-primary-500" }: MetricCardProps) {
  return (
    <div className={`card border-l-4 ${accentColor}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && (
            <div className="flex items-center gap-1 mt-1">
              {trend !== undefined && (
                trend > 0 ? (
                  <TrendingUp className="w-3 h-3 text-green-600" />
                ) : trend < 0 ? (
                  <TrendingDown className="w-3 h-3 text-red-600" />
                ) : (
                  <Minus className="w-3 h-3 text-gray-400" />
                )
              )}
              <span className={`text-xs ${
                trend && trend > 0 ? "text-green-600" : trend && trend < 0 ? "text-red-600" : "text-gray-500"
              }`}>
                {subtitle}
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className="p-2 bg-gray-50 rounded-lg">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
