// Structured JSON logging shared by every edge function (plan section 5.2:
// "structured JSON logs (no emojis)"). One JSON object per line so log
// aggregation can parse fields directly instead of scraping free text.

export type LogLevel = 'info' | 'warn' | 'error';

export function log(level: LogLevel, event: string, fields: Record<string, unknown> = {}): void {
  const line = JSON.stringify({level, event, ...fields, timestamp: new Date().toISOString()});
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}
