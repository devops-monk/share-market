export type AlertType =
  | 'price_above'
  | 'price_below'
  | 'score_above'
  | 'score_below'
  | 'bearish_score_above'
  | 'rsi_above'
  | 'rsi_below'
  | 'minervini_pass'
  | 'uptrend_below_resistance'
  | 'daily_summary';

export interface AlertRule {
  id: string;
  type: AlertType;
  ticker: string;        // specific ticker or '*' for all stocks
  threshold: number;
  enabled: boolean;
  note?: string;
}

export interface AlertConfig {
  rules: AlertRule[];
}

// Tracks which alerts have fired to avoid duplicates
// key = "ruleId:ticker", value = ISO timestamp of last fire
export type AlertState = Record<string, string>;

export interface TriggeredAlert {
  ruleId: string;
  ticker: string;
  type: AlertType;
  message: string;
  value: number;
  threshold: number;
}
