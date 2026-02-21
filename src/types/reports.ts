export type ReportType = "pnl" | "expense" | "aging" | "vendor" | "cashflow" | "custom";

export interface ReportRequest {
  reportType: ReportType;
  dateRange: {
    start: string;
    end: string;
  };
  options?: {
    includeCommentary?: boolean;
    compareWithPrevious?: boolean;
    detailLevel?: "summary" | "detailed";
  };
}

export interface GeneratedReport {
  id?: string;
  title: string;
  reportType: ReportType;
  dateRange: string;
  content: string;
  summary: string;
  createdAt: string;
}
