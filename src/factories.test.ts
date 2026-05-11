import { afterEach, describe, expect, mock, test } from "bun:test"

import { APIError } from "./errors"
import { createFetcher, createFormDataFetcher } from "./factories"

const originalFetch = globalThis.fetch

describe("createFetcher", () => {
	afterEach(() => {
		globalThis.fetch = originalFetch
	})

	test("should create fetcher with correct pathname", async () => {
		const mockData = { id: 1 }
		// @ts-expect-error
		globalThis.fetch = mock(() =>
			Promise.resolve({
				ok: true,
				status: 200,
				headers: new Headers({ "content-type": "application/json" }),
				json: () => Promise.resolve(mockData),
			} as Response),
		)

		const fetcher = createFetcher("https://api.example.com")
		const result = await fetcher("users", "1")()

		expect(result).toEqual(mockData)
		expect(globalThis.fetch).toHaveBeenCalledWith(
			"https://api.example.com/users/1",
			expect.objectContaining({
				headers: expect.objectContaining({
					"Content-Type": "application/json",
				}),
			}),
		)
	})

	test("should handle query parameters", async () => {
		// @ts-expect-error
		globalThis.fetch = mock(() =>
			Promise.resolve({
				ok: true,
				status: 200,
				headers: new Headers({ "content-type": "application/json" }),
				json: () => Promise.resolve([]),
			} as Response),
		)

		const fetcher = createFetcher("https://api.example.com")
		await fetcher("users", "?page=1&limit=10")()

		expect(globalThis.fetch).toHaveBeenCalledWith(
			"https://api.example.com/users?page=1&limit=10",
			expect.any(Object),
		)
	})

	test("should apply interceptor", async () => {
		// @ts-expect-error
		globalThis.fetch = mock(() =>
			Promise.resolve({
				ok: true,
				status: 200,
				headers: new Headers({ "content-type": "application/json" }),
				json: () => Promise.resolve({}),
			} as Response),
		)

		const interceptor = mock(async (options: RequestInit) => ({
			...options,
			headers: {
				...options.headers,
				Authorization: "Bearer token",
			},
		}))

		const fetcher = createFetcher("https://api.example.com", { interceptor })
		await fetcher("users")()

		expect(interceptor).toHaveBeenCalledTimes(1)
	})

	test("should fire onResponse with ctx on success", async () => {
		// @ts-expect-error
		globalThis.fetch = mock(() =>
			Promise.resolve({
				ok: true,
				status: 200,
				headers: new Headers({ "content-type": "application/json" }),
				json: () => Promise.resolve({}),
			} as Response),
		)

		const onResponse = mock((_ctx: unknown) => {})
		const fetcher = createFetcher("https://api.example.com", { onResponse })
		await fetcher("users")()

		await new Promise((r) => setTimeout(r, 0))
		expect(onResponse).toHaveBeenCalledTimes(1)
		const ctx = onResponse.mock.calls[0]?.[0] as {
			url: string
			status: number
			ttfb_ms: number
			duration_ms: number
			curl: string
		}
		expect(ctx.url).toBe("https://api.example.com/users")
		expect(ctx.status).toBe(200)
		expect(typeof ctx.ttfb_ms).toBe("number")
		expect(typeof ctx.duration_ms).toBe("number")
		expect(ctx.curl).toContain("curl -X GET")
	})

	test("should fire onError with APIError ctx on non-2xx", async () => {
		// @ts-expect-error
		globalThis.fetch = mock(() =>
			Promise.resolve({
				ok: false,
				status: 404,
				statusText: "Not Found",
				headers: new Headers({ "content-type": "application/json" }),
				json: () => Promise.resolve({ message: "nope" }),
			} as Response),
		)

		const onError = mock((_ctx: unknown) => {})
		const fetcher = createFetcher("https://api.example.com", { onError })

		try {
			await fetcher("users", "1")()
		} catch {}

		await new Promise((r) => setTimeout(r, 0))
		expect(onError).toHaveBeenCalledTimes(1)
		const ctx = onError.mock.calls[0]?.[0] as {
			status: number | null
			error: unknown
		}
		expect(ctx.status).toBe(404)
		expect(ctx.error).toBeInstanceOf(APIError)
	})

	test("should fire onError with status=null on network failure", async () => {
		// @ts-expect-error
		globalThis.fetch = mock(() => Promise.reject(new Error("network down")))

		const onError = mock((_ctx: unknown) => {})
		const fetcher = createFetcher("https://api.example.com", { onError })

		try {
			await fetcher("users")()
		} catch {}

		await new Promise((r) => setTimeout(r, 0))
		expect(onError).toHaveBeenCalledTimes(1)
		const ctx = onError.mock.calls[0]?.[0] as {
			status: number | null
			ttfb_ms: number | null
		}
		expect(ctx.status).toBeNull()
		expect(ctx.ttfb_ms).toBeNull()
	})

	test("hook rejection should not break caller", async () => {
		// @ts-expect-error
		globalThis.fetch = mock(() =>
			Promise.resolve({
				ok: true,
				status: 200,
				headers: new Headers({ "content-type": "application/json" }),
				json: () => Promise.resolve({ ok: true }),
			} as Response),
		)

		const onResponse = mock(async () => {
			throw new Error("hook blew up")
		})
		const fetcher = createFetcher("https://api.example.com", { onResponse })
		const result = await fetcher("users")()
		expect(result).toEqual({ ok: true })
	})
})

describe("createFormDataFetcher", () => {
	afterEach(() => {
		globalThis.fetch = originalFetch
	})

	test("should not set Content-Type header for FormData", async () => {
		// @ts-expect-error
		globalThis.fetch = mock(() =>
			Promise.resolve({
				ok: true,
				status: 200,
				headers: new Headers({ "content-type": "application/json" }),
				json: () => Promise.resolve({ url: "uploaded.jpg" }),
			} as Response),
		)

		const fetcher = createFormDataFetcher("https://api.example.com")
		const formData = new FormData()
		formData.append("file", new Blob(["test"]), "test.txt")

		await fetcher("upload")({
			method: "POST",
			body: formData,
		})

		// Verify Content-Type is NOT set (browser will set it with boundary)
		// @ts-expect-error
		const fetchCall = globalThis.fetch.mock.calls[0]
		const headers = fetchCall[1].headers
		expect(headers["Content-Type"]).toBeUndefined()
	})
})
