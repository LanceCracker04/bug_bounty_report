import type { HttpHeader, ParsedHttpMessage } from "../types/http";
const sensitive =
  /^(authorization|proxy-authorization|cookie|set-cookie|x-api-key|x-auth-token|.*csrf.*)$/i;
export function parseHttpMessage(raw: string): {
  message: ParsedHttpMessage;
  warnings: string[];
} {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const first = lines.shift() ?? "";
  const headers: HttpHeader[] = [];
  while (lines.length && lines[0].trim()) {
    const line = lines.shift() ?? "";
    const index = line.indexOf(":");
    if (index < 1) continue;
    const name = line.slice(0, index).trim();
    headers.push({
      id: crypto.randomUUID(),
      name,
      value: line.slice(index + 1).trim(),
      sensitive: sensitive.test(name),
    });
  }
  if (lines[0] === "") lines.shift();
  const body = lines.join("\n");
  const response = /^HTTP\/(\S+)\s+(\d{3})\s*(.*)$/i.exec(first);
  const request = /^([A-Z]+)\s+(\S+)\s+HTTP\/(\S+)$/i.exec(first);
  return {
    message: {
      startLine: first,
      method: request?.[1],
      url: request?.[2],
      httpVersion: request?.[3] ?? response?.[1],
      statusCode: response ? Number(response[2]) : undefined,
      statusText: response?.[3],
      headers,
      body: body || undefined,
      contentType: headers.find(
        (header) => header.name.toLowerCase() === "content-type",
      )?.value,
      byteLength: new Blob([raw]).size,
    },
    warnings:
      request || response
        ? []
        : [
            "The start line was not recognized as a standard HTTP request or response.",
          ],
  };
}
