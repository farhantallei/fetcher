import { afterEach, describe, expect, mock, test } from "bun:test"

import { createBaseFetcher } from "./core"
import { APIError } from "./errors"

// Mock global fetch
const originalFetch = globalThis.fetch

describe("createBaseFetcher", () => {
	afterEach(() => {
		globalThis.fetch = originalFetch
	})

	test("should make successful request with JSON response", async () => {
		const mockData = { id: 1, name: "John" }

		// @ts-expect-error
		globalThis.fetch = mock(() =>
			Promise.resolve({
				ok: true,
				status: 200,
				headers: new Headers({ "content-type": "application/json" }),
				json: () => Promise.resolve(mockData),
			} as Response),
		)

		const baseFetcher = createBaseFetcher("https://api.example.com")
		const result = await baseFetcher("/users/1", {})

		expect(result).toEqual(mockData)
		expect(globalThis.fetch).toHaveBeenCalledWith(
			"https://api.example.com/users/1",
			expect.any(Object),
		)
	})

	test("should handle text response", async () => {
		// @ts-expect-error
		globalThis.fetch = mock(() =>
			Promise.resolve({
				ok: true,
				status: 200,
				headers: new Headers({ "content-type": "text/plain" }),
				text: () => Promise.resolve("Plain text response"),
			} as Response),
		)

		const baseFetcher = createBaseFetcher("https://api.example.com")
		const result = await baseFetcher("/status", {})

		expect(result).toBe("Plain text response")
	})

	test("should return null for 204 status", async () => {
		// @ts-expect-error
		globalThis.fetch = mock(() =>
			Promise.resolve({
				ok: true,
				status: 204,
				headers: new Headers(),
				text: () => Promise.resolve("Plain text response"),
			} as Response),
		)

		const baseFetcher = createBaseFetcher("https://api.example.com")
		const result = await baseFetcher("/users/1", { method: "DELETE" })

		expect(result).toBeNull()
	})

	test("should throw APIError on failed request", async () => {
		const errorData = { message: "User not found" }

		// @ts-expect-error
		globalThis.fetch = mock(() =>
			Promise.resolve({
				ok: false,
				status: 404,
				statusText: "Not Found",
				headers: new Headers({ "content-type": "application/json" }),
				json: () => Promise.resolve(errorData),
			} as Response),
		)

		const baseFetcher = createBaseFetcher("https://api.example.com")

		try {
			await baseFetcher("/users/999", {})
			expect(true).toBe(false) // Should not reach here
		} catch (error) {
			expect(error).toBeInstanceOf(APIError)
			expect((error as APIError).status).toBe(404)
			expect((error as APIError).message).toBe("User not found")
			expect((error as APIError).url).toBe("https://api.example.com/users/999")
		}
	})

	test("should apply default headers", async () => {
		// @ts-expect-error
		globalThis.fetch = mock(() =>
			Promise.resolve({
				ok: true,
				status: 200,
				headers: new Headers({ "content-type": "application/json" }),
				json: () => Promise.resolve({}),
			} as Response),
		)

		const baseFetcher = createBaseFetcher("https://api.example.com", {
			"Content-Type": "application/json",
			"X-Custom": "value",
		})

		await baseFetcher("/users", {})

		expect(globalThis.fetch).toHaveBeenCalledWith(
			"https://api.example.com/users",
			expect.objectContaining({
				headers: expect.objectContaining({
					"Content-Type": "application/json",
					"X-Custom": "value",
				}),
			}),
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
				Authorization: "Bearer test-token",
			},
		}))

		const baseFetcher = createBaseFetcher(
			"https://api.example.com",
			{},
			interceptor,
		)

		await baseFetcher("/users", {})

		expect(interceptor).toHaveBeenCalledTimes(1)
		expect(globalThis.fetch).toHaveBeenCalledWith(
			"https://api.example.com/users",
			expect.objectContaining({
				headers: expect.objectContaining({
					Authorization: "Bearer test-token",
				}),
			}),
		)
	})

	test("should merge request options with default headers", async () => {
		// @ts-expect-error
		globalThis.fetch = mock(() =>
			Promise.resolve({
				ok: true,
				status: 200,
				headers: new Headers({ "content-type": "application/json" }),
				json: () => Promise.resolve({}),
			} as Response),
		)

		const baseFetcher = createBaseFetcher("https://api.example.com", {
			"Content-Type": "application/json",
		})

		await baseFetcher("/users", {
			method: "POST",
			headers: { "X-Request-ID": "123" },
		})

		expect(globalThis.fetch).toHaveBeenCalledWith(
			"https://api.example.com/users",
			expect.objectContaining({
				method: "POST",
				headers: expect.objectContaining({
					"Content-Type": "application/json",
					"X-Request-ID": "123",
				}),
			}),
		)
	})
})
