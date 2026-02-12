import { afterEach, describe, expect, mock, test } from "bun:test"

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

		const fetcher = createFetcher("https://api.example.com", interceptor)
		await fetcher("users")()

		expect(interceptor).toHaveBeenCalledTimes(1)
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
