# @farhantallei/fetcher

A **universal HTTP client** for browser and Node.js with support for **interceptors, authentication, logging, and form-data requests**. Designed to be modular, extensible, and reusable across multiple projects and enterprise applications.

---

## Features

- Universal support: works in **Node.js** and **browser** environments
- **Composable interceptors** for logging, auth, whitelabel, and custom behaviors
- Built-in support for **FormData** payloads
- **Typed error listener** with discriminated union (`APIError` vs unknown)
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

### Error Listener

```ts
import { createFetcher } from "@farhantallei/fetcher"

const fetcher = createFetcher("https://api.example.com", {
  onError: (err) => {
    if (err.type === "api") {
      console.error(err.error.status, err.error.message)
    } else {
      console.error("Unexpected error", err.error)
    }
  },
})
```

### Interceptor + Error Listener

```ts
const fetcher = createFetcher("https://api.example.com", {
  interceptor: authInterceptor,
  onError: (err) => {
    if (err.type === "api" && err.error.isUnauthorized()) {
      logout()
    }
  },
})
```

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

### `createFetcher(baseUrl: string, config?)`

Create a fetcher function for HTTP requests.

* `baseUrl`: Base URL for requests
* `config.interceptor?`: Optional composed interceptor function
* `config.onError?`: Optional error listener with typed discriminated union

Returns a function:

```ts
fetcher(...endpoint: string[])({ method: string, body?: any })
```

### `createFormDataFetcher(baseUrl: string, config?)`

Same as `createFetcher` but automatically handles FormData payloads.

### Interceptors

* `composeInterceptors(...interceptors)` – Compose multiple interceptors
* `loggingInterceptor` – Logs requests and responses
* `createInterceptor(fn)` – Create custom interceptors

### Error Handling

Errors thrown by the fetcher are instances of `APIError`. The `onError` listener receives a typed `FetcherError`:

```ts
type FetcherError =
  | { type: "api"; error: APIError }    // HTTP errors (4xx, 5xx)
  | { type: "unknown"; error: unknown } // network errors, etc.
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
  Fetcher,
  FetcherConfig,
  FetcherError,
  FetcherErrorListener,
  FetcherInterceptor,
  FetcherOptions,
} from "@farhantallei/fetcher"
```

---

## Migration Guide

### v1 → v2

`createFetcher` and `createFormDataFetcher` now accept a config object instead of positional parameters.

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
