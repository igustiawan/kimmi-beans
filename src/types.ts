// src/types.ts
export type TabName = "mint" | "bean" | "rank" | "faq" | "daily";

export interface DailySummary {
  level?: number;
  beans?: number;
  rank?: number | null;
  username?: string | null;
}
