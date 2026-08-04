export interface HttpHeader {
  id: string;
  name: string;
  value: string;
  sensitive: boolean;
}
export interface ParsedHttpMessage {
  startLine?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  statusText?: string;
  httpVersion?: string;
  headers: HttpHeader[];
  body?: string;
  contentType?: string;
  byteLength?: number;
}
export interface HttpTranscript {
  id: string;
  reportId?: string;
  sessionId?: string;
  title: string;
  request?: ParsedHttpMessage;
  response?: ParsedHttpMessage;
  source: "Manual Paste" | "HAR Import" | "Text Import" | "Other";
  notes?: string;
  tags: string[];
  rawRequest?: string;
  rawResponse?: string;
  createdAt: string;
  updatedAt: string;
}
