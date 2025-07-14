export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'TRACE';
  thread: string;
  className: string;
  message: string;
  raw: string;
}

export interface LogFilter {
  search: string;
  level: string;
  dateFrom: string;
  dateTo: string;
}

export interface LogStats {
  total: number;
  info: number;
  warn: number;
  error: number;
  debug: number;
  trace: number;
}