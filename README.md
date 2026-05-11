# @farhantallei/fetcher

A **universal HTTP client** for browser and Node.js with support for **interceptors, authentication, observability hooks, log shipping, and form-data requests**. Designed to be modular, extensible, and reusable across multiple projects and enterprise applications.

---

## Features

- Universal support: works in **Node.js** and **browser** environments
- **Composable interceptors** for logging, auth, whitelabel, and custom behaviors
- Built-in support for **FormData** payloads
- **Response & error hooks** with `duration_ms`, `ttfb_ms`, and pre-built curl
- **Built-in log shipper** with batching, header redaction, and async context fields
- TypeScript-ready with full type definitions
- Clean and extensible API for scalable projects

---

## Installation

```bash
npm install @farhantallei/fetcher
# or
yarn add @farhantallei/fetcher
```

---

## Usage

### Basic Fetcher

```ts
import { buildQueryParams, createFetcher } from "@farhantallei/fetcher"

const fetcher = createFetcher("https://api.example.com")

const query = { message: "hello" }

const q = buildQueryParams(query)

const response = await fetcher("/users", q)({
  method: "GET",
})
```

### Using Interceptors

```ts
import { createFetcher, composeInterceptors, loggingInterceptor, createInterceptor } from "@farhantallei/fetcher"

const authInterceptor = createInterceptor((config) => {
  config.headers.Authorization = `Bearer ${process.env.API_TOKEN}`
  return config
})

const fetcher = createFetcher("https://api.example.com", {
  interceptor: composeInterceptors(loggingInterceptor, authInterceptor),
})

const response = await fetcher("/users")({
  method: "POST",
  body: JSON.stringify({ message: "hello" })
})
```

### Response & Error Hooks

```ts
import { createFetcher, APIError } from "@farhantallei/fetcher"

const fetcher = createFetcher("https://api.example.com", {
  onResponse: (ctx) => {
    // ctx.url, ctx.status, ctx.duration_ms, ctx.ttfb_ms, ctx.curl
    console.log(`${ctx.options.method ?? "GET"} ${ctx.status} ${ctx.duration_ms}ms`)
  },
  onError: (ctx) => {
    // ctx.status is null on network/pre-flight failure
    if (ctx.error instanceof APIError && ctx.error.isUnauthorized()) {
      logout()
    }
  },
})
```

Hooks are **fire-and-forget** — they run after the response is returned to the caller and rejections from a hook are swallowed, so handlers can't block or break the call.

**Why TTFB matters**
- `ttfb_ms` ≈ backend processing time on warm connections (network RTT typically 5–20 ms). Approximates backend latency without server cooperation.
- `duration_ms - ttfb_ms` = body download + parse — indicates large payloads or heavy JSON.

### Built-in Log Shipper

Set `logger` to batch-ship every request as a structured log entry to an HTTP ingest endpoint (e.g. Better Stack, Logtail, custom collector).

```ts
import { createFetcher } from "@farhantallei/fetcher"
import { headers } from "next/headers"

export const fetcher = createFetcher(baseUrl, {
  interceptor: authInterceptor,
  logger: {
    url: process.env.LOG_INGEST_URL!,
    token: process.env.LOG_INGEST_TOKEN!,
    // Optional — defaults shown
    redactHeaders: ["Authorization", "App-Key", "Cookie"],
    batchSize: 20,
    flushMs: 2000,
    // Merged into every entry (async OK — runs per request)
    extraFields: async () => {
      const h = await headers()
      return {
        pathname: h.get("x-pathname"),
        request_id: h.get("x-request-id"),
      }
    },
    // Override the `message` field
    messageFormat: (entry) => {
      const idTag = entry.request_id ? `[${entry.request_id}] ` : ""
      const status = entry.status ?? "ERR"
      const route = entry.pathname
        ? `${entry.pathname} → ${entry.endpoint}`
        : entry.endpoint
      return `${idTag}${entry.method} ${status} ${route}`
    },
  },
})
```

The shipper:
- Maintains a per-`(url, token)` queue stored on `globalThis` (survives HMR in dev).
- Flushes when `queue.length >= batchSize` **or** `flushMs` elapses.
- POSTs the batch as a JSON array with `Authorization: Bearer <token>`.
- Redacts sensitive header values in the captured curl (replaced with `***`).
- Swallows ingest failures so they never break the user-facing call.

Call `flushLogger(cfg)` to force-drain pending entries (e.g. on graceful shutdown).

```ts
import { flushLogger } from "@farhantallei/fetcher"

await flushLogger(loggerConfig)
```

`onResponse` / `onError` still fire when `logger` is set — user hook runs first, then the entry is enqueued.

### FormData Support

```ts
import { buildFormData, createFormDataFetcher } from "@farhantallei/fetcher"

const formDataFetcher = createFormDataFetcher("https://api.example.com")

const data = { message: "hello" }

const formData = buildFormData(data)

const response = await formDataFetcher("/upload")({
  method: "POST",
  body: formData,
})
```

---

## API

### `createFetcher(baseUrl: string, config?: FetcherConfig)`

Create a fetcher function for HTTP requests.

* `baseUrl`: Base URL for requests
* `config.interceptor?`: Composed interceptor function
* `config.onResponse?(ctx: ResponseContext)`: Fires after a successful response
* `config.onError?(ctx: ErrorContext)`: Fires on `APIError` (non-2xx) or pre-flight failure (network/abort)
* `config.logger?`: `LoggerConfig` — enables the built-in batch shipper

Returns a function:

```ts
fetcher(...endpoint: string[])({ method: string, body?: any })
```

### `createFormDataFetcher(baseUrl: string, config?: FetcherConfig)`

Same as `createFetcher` but automatically handles FormData payloads (no `Content-Type` default, curl is built with `-F` parts).

### `flushLogger(config: LoggerConfig)`

Force-flush pending log entries for the given config. Useful for graceful shutdown or end-of-request hooks in serverless runtimes.

### Interceptors

* `composeInterceptors(...interceptors)` – Compose multiple interceptors
* `loggingInterceptor` – Logs requests and responses
* `createInterceptor(fn)` – Create custom interceptors

### Contexts

```ts
type ResponseContext = {
  url: string
  options: RequestInit       // post-interceptor
  status: number
  duration_ms: number        // start → body parsed
  ttfb_ms: number            // start → headers received
  curl: string
}

type ErrorContext = {
  url: string
  options: RequestInit
  status: number | null      // null on pre-flight error (network, abort)
  duration_ms: number
  ttfb_ms: number | null     // null if error before headers received
  curl: string
  error: APIError | Error
}
```

### Error Handling

Errors thrown by the fetcher are instances of `APIError`. The `onError(ctx)` hook receives a rich context — branch on `ctx.error instanceof APIError` to distinguish HTTP errors from network/abort errors:

```ts
const fetcher = createFetcher("https://api.example.com", {
  onError: (ctx) => {
    if (ctx.error instanceof APIError) {
      console.error("API", ctx.status, ctx.error.message)
    } else {
      console.error("Network", ctx.error)
    }
  },
})
```

You can also catch errors directly:

```ts
try {
  await fetcher("/users")({ method: "GET" })
} catch (err) {
  if (err instanceof APIError) {
    console.error(err.status, err.message)
  }
}
```

`APIError` helper methods:

* `.isClientError()` – 4xx
* `.isServerError()` – 5xx
* `.isBadRequest()` – 400
* `.isUnauthorized()` – 401
* `.isForbidden()` – 403
* `.isNotFound()` – 404

---

## TypeScript Types

```ts
import type {
  ErrorContext,
  ErrorListener,
  Fetcher,
  FetcherConfig,
  FetcherInterceptor,
  FetcherOptions,
  LogEntry,
  LogEntryBase,
  LoggerConfig,
  ResponseContext,
  ResponseListener,
} from "@farhantallei/fetcher"
```

---

## Migration Guide

### v2 → v3

`onError` no longer receives a discriminated union — it receives a rich `ErrorContext`. The `FetcherError` and `FetcherErrorListener` types were removed.

```ts
// v2
createFetcher(baseUrl, {
  onError: (err) => {
    if (err.type === "api") {
      console.error(err.error.status, err.error.message)
    } else {
      console.error("Unexpected", err.error)
    }
  },
})

// v3
import { APIError } from "@farhantallei/fetcher"

createFetcher(baseUrl, {
  onError: (ctx) => {
    if (ctx.error instanceof APIError) {
      console.error(ctx.error.status, ctx.error.message)
    } else {
      console.error("Unexpected", ctx.error)
    }
  },
})
```

New in v3: `onResponse(ctx)` hook and the built-in `logger` config — see the [Built-in Log Shipper](#built-in-log-shipper) section.

### v1 → v2

`createFetcher` and `createFormDataFetcher` accept a config object instead of positional parameters.

```ts
// v1
createFetcher(baseUrl, interceptor)

// v2
createFetcher(baseUrl, { interceptor })
```

---

## Contributing

PRs and issues are welcome. Designed for **scalable enterprise usage**, so feel free to suggest improvements or new interceptors.

---

## License

MIT
