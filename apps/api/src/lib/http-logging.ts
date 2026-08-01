import type { IncomingMessage, ServerResponse } from "node:http";
import pino from "pino";
import type { Options } from "pino-http";
import { sanitizeRequestParams, sanitizeRequestUrl } from "./sanitize-request-url.js";

export interface LogCaptureStream {
  write(message: string): void;
}

const REDACTED_HEADER_VALUE = "[REDACTED]";
const REDACTED_REQUEST_HEADERS = ["authorization", "cookie", "set-cookie", "x-api-key"] as const;

function sanitizeHeaders(headers: IncomingMessage["headers"] | undefined): IncomingMessage["headers"] {
  if (!headers) {
    return {};
  }

  const sanitized = { ...headers } as Record<string, string | string[] | undefined>;

  for (const headerName of REDACTED_REQUEST_HEADERS) {
    if (headerName in sanitized) {
      sanitized[headerName] = REDACTED_HEADER_VALUE;
    }
  }

  return sanitized as IncomingMessage["headers"];
}

function serializeRequest(req: IncomingMessage & { id?: string | number; query?: unknown; params?: unknown }) {
  const url = sanitizeRequestUrl(req.url ?? "");
  const params = sanitizeRequestParams(req.params as Record<string, string | undefined> | undefined);

  return {
    id: req.id,
    method: req.method,
    url,
    query: req.query,
    params,
    headers: sanitizeHeaders(req.headers),
    remoteAddress: req.socket?.remoteAddress,
    remotePort: req.socket?.remotePort
  };
}

function serializeResponse(res: ServerResponse) {
  return {
    statusCode: res.statusCode,
    headers: sanitizeHeaders(res.getHeaders?.() as IncomingMessage["headers"])
  };
}

export function createHttpLoggerOptions(logStream?: LogCaptureStream): Options {
  const options: Options = {
    serializers: {
      req: serializeRequest,
      res: serializeResponse
    }
  };

  if (logStream) {
    options.logger = pino(
      {
        level: process.env.NODE_ENV === "test" ? "info" : undefined
      },
      logStream
    );
  }

  return options;
}
