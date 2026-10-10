export type ScreenId = "today" | "train" | "nutrition" | "wellbeing" | "recovery" | "sleep" | "strain" | "routines" | "progress" | "settings";
export type ThemeId = "light" | "dark";
export interface HealthMetric {
  id: string;
  value: number | null;
  unit: string;
  date: string | null;
  source: string | null;
  importedAt: string | null;
  freshness: "fresh" | "stale" | "unknown" | "missing";
  confidence: "high" | "medium" | "low" | null;
  partial: boolean;
}
export type PrimaryTab = "home" | "train" | "food" | "wellbeing" | "insights";
export interface FeatureLifecycle {
  mount(): void;
  update(): void;
  destroy(): void;
}
export interface RouteDefinition {
  id: string;
  path: string;
  title: string;
  aliases?: string[];
  activate(): void;
}
