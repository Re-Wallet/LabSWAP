import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export type LogEvent = {
  ts: string;
  lab: "lab1" | "lab2" | "lab3" | "setup";
  event: "quote" | "build" | "sign" | "submit" | "verify" | "error" | "info";
  network: string;
  actor?: string;
  assetIn?: string;
  assetOut?: string;
  amountIn?: string;
  amountOut?: string;
  priceEffective?: string;
  priceMarginal?: string;
  slippageBps?: number;
  txHash?: string;
  status: "ok" | "fail";
  errorCode?: string | null;
  meta?: Record<string, unknown>;
};

export function log(event: Omit<LogEvent, "ts">) {
  const ts = new Date().toISOString();
  const dir = join("logs", event.lab);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${ts.slice(0, 10)}.jsonl`);
  const line = JSON.stringify({ ts, ...event }) + "\n";
  appendFileSync(file, line);
  console.log(`[${event.lab}/${event.event}]`, event.status, event.meta ?? "");
}
