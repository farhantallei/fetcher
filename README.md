# @farhantallei/fetcher

A **universal HTTP client** for browser and Node.js with support for **interceptors, authentication, logging, and form-data requests**. Designed to be modular, extensible, and reusable across multiple projects and enterprise applications.

---

## Features

- Universal support: works in **Node.js** and **browser** environments  
- **Composable interceptors** for logging, auth, whitelabel, and custom behaviors  
- Built-in support for **FormData** payloads  
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

const fetcher = createFetcher(
  "https://api.example.com",
  composeInterceptors(loggingInterceptor, authInterceptor)
)

const response = await fetcher("/users")({
  method: "POST",
  body: JSON.stringify({ message: "hello" })
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

### `createFetcher(baseUrl: string, interceptor?)`

Create a fetcher function for HTTP requests.

* `baseUrl`: Base URL for requests
* `interceptor?`: Optional composed interceptor function

Returns a function:

```ts
fetcher(...endpoint: string[])({ method: string, body?: any })
```

### `createFormDataFetcher(baseUrl: string, interceptor?)`

Same as `createFetcher` but automatically handles FormData payloads.

### Interceptors

* `composeInterceptors(...interceptors)` – Compose multiple interceptors
* `loggingInterceptor` – Logs requests and responses
* `createInterceptor(fn)` – Create custom interceptors

### Error Handling

* `APIError` – Standardized error class for HTTP requests

```ts
try {
  await fetcher("/users")({ method: "GET" })
} catch (err) {
  if (err instanceof APIError) {
    console.error(err.status, err.message)
  }
}
```

---

## TypeScript Types

```ts
import type { FetcherInterceptor, FetcherOptions } from "@farhantallei/fetcher"
```

---

## Contributing

PRs and issues are welcome. Designed for **scalable enterprise usage**, so feel free to suggest improvements or new interceptors.

---

## License

MIT
