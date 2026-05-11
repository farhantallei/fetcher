import { afterEach, describe, expect, mock, test } from "bun:test"

import { createFetcher } from "./factories"
import { flushLogger, shipLog } from "./logger"
import type { LoggerConfig } from "./types"

const originalFetch = globalThis.fetch

const baseCfg: LoggerConfig = {
	url: "https://ingest.example.com/logs",
	token: "secret",
	batchSize: 2,
	flushMs: 50,
}

function uniqueCfg(extra: Partial<LoggerConfig> = {}): LoggerConfig {
	return {
		...baseCfg,
		token: `secret-${Math.random()}`,
		...extra,
	}
}

describe("logger", () => {
	afterEach(() => {
		globalThis.fetch = originalFetch
	})

	test("shipLog flushes when batchSize reached", async () => {
		const cfg = uniqueCfg({ batchSize: 2, flushMs: 10_000 })
		const calls: Array<{ url: string; body: unknown }> = []
		// @ts-expect-error
		globalThis.fetch = mock(async (url: string, init: RequestInit) => {
			calls.push({ url, body: JSON.parse(init.body as string) })
			return new Response("{}", { status: 200 })
		})

		await shipLog(cfg, {
			level: "info",
			endpoint: "/a",
			method: "GET",
			status: 200,
			duration_ms: 10,
			ttfb_ms: 5,
			curl: "curl X",
		})
		expect(calls.length).toBe(0)

		await shipLog(cfg, {
			level: "info",
			endpoint: "/b",
			method: "GET",
			status: 200,
			duration_ms: 12,
			ttfb_ms: 6,
			curl: "curl Y",
		})

		await new Promise((r) => setTimeout(r, 0))
		expect(calls.length).toBe(1)
		expect(calls[0]?.url).toBe(cfg.url)
		expect(Array.isArray(calls[0]?.body)).toBe(true)
		expect((calls[0]?.body as unknown[]).length).toBe(2)
	})

	test("shipLog flushes on timer", async () => {
		const cfg = uniqueCfg({ batchSize: 100, flushMs: 20 })
		const calls: unknown[] = []
		// @ts-expect-error
		globalThis.fetch = mock(async (_url: string, init: RequestInit) => {
			calls.push(JSON.parse(init.body as string))
			return new Response("{}", { status: 200 })
		})

		await shipLog(cfg, {
			level: "info",
			endpoint: "/x",
			method: "GET",
			status: 200,
			duration_ms: 10,
			ttfb_ms: 5,
			curl: "curl X",
		})
		expect(calls.length).toBe(0)

		await new Promise((r) => setTimeout(r, 60))
		expect(calls.length).toBe(1)
	})

	test("redactHeaders masks values in curl", async () => {
		const cfg = uniqueCfg({ batchSize: 1 })
		let body: unknown
		// @ts-expect-error
		globalThis.fetch = mock(async (_url: string, init: RequestInit) => {
			body = JSON.parse(init.body as string)
			return new Response("{}", { status: 200 })
		})

		await shipLog(cfg, {
			level: "info",
			endpoint: "/x",
			method: "GET",
			status: 200,
			duration_ms: 1,
			ttfb_ms: 1,
			curl: 'curl -X GET "u" -H "Authorization: Bearer abc" -H "X-Other: keep"',
		})

		await new Promise((r) => setTimeout(r, 0))
		const entry = (body as Array<{ curl: string }>)[0]
		expect(entry?.curl).toContain('"Authorization: ***"')
		expect(entry?.curl).toContain('"X-Other: keep"')
	})

	test("extraFields merge + default messageFormat", async () => {
		const cfg = uniqueCfg({
			batchSize: 1,
			extraFields: () => ({ request_id: "rid-1", role_id: 7 }),
		})
		let body: unknown
		// @ts-expect-error
		globalThis.fetch = mock(async (_url: string, init: RequestInit) => {
			body = JSON.parse(init.body as string)
			return new Response("{}", { status: 200 })
		})

		await shipLog(cfg, {
			level: "info",
			endpoint: "/api/users",
			method: "POST",
			status: 201,
			duration_ms: 1,
			ttfb_ms: 1,
			curl: "curl",
		})
		await new Promise((r) => setTimeout(r, 0))
		const entry = (body as Array<Record<string, unknown>>)[0]
		expect(entry?.request_id).toBe("rid-1")
		expect(entry?.role_id).toBe(7)
		expect(entry?.message).toBe("POST /api/users 201")
		expect(typeof entry?.dt).toBe("string")
	})

	test("messageFormat callback overrides default", async () => {
		const cfg = uniqueCfg({
			batchSize: 1,
			extraFields: () => ({ request_id: "rid-9" }),
			messageFormat: (e) => `[${e.request_id}] ${e.method} ${e.endpoint}`,
		})
		let body: unknown
		// @ts-expect-error
		globalThis.fetch = mock(async (_url: string, init: RequestInit) => {
			body = JSON.parse(init.body as string)
			return new Response("{}", { status: 200 })
		})

		await shipLog(cfg, {
			level: "info",
			endpoint: "/x",
			method: "GET",
			status: 200,
			duration_ms: 1,
			ttfb_ms: 1,
			curl: "curl",
		})
		await new Promise((r) => setTimeout(r, 0))
		const entry = (body as Array<{ message: string }>)[0]
		expect(entry?.message).toBe("[rid-9] GET /x")
	})

	test("flushLogger flushes pending entries", async () => {
		const cfg = uniqueCfg({ batchSize: 100, flushMs: 10_000 })
		const calls: unknown[] = []
		// @ts-expect-error
		globalThis.fetch = mock(async () => {
			calls.push(1)
			return new Response("{}", { status: 200 })
		})

		await shipLog(cfg, {
			level: "info",
			endpoint: "/x",
			method: "GET",
			status: 200,
			duration_ms: 1,
			ttfb_ms: 1,
			curl: "c",
		})
		await flushLogger(cfg)
		expect(calls.length).toBe(1)
	})

	test("createFetcher integration: ships info entry on success", async () => {
		const cfg = uniqueCfg({ batchSize: 1 })
		const fetchMock = mock(async (url: string, _init?: RequestInit) => {
			if (url === cfg.url) {
				return new Response("{}", { status: 200 })
			}
			return {
				ok: true,
				status: 200,
				headers: new Headers({ "content-type": "application/json" }),
				json: async () => ({ id: 1 }),
			} as Response
		})
		// @ts-expect-error
		globalThis.fetch = fetchMock

		const fetcher = createFetcher("https://api.example.com", { logger: cfg })
		await fetcher("users", "1")()

		await new Promise((r) => setTimeout(r, 0))
		const ingestCall = fetchMock.mock.calls.find(
			(c) => (c[0] as string) === cfg.url,
		)
		expect(ingestCall).toBeDefined()
		const body = JSON.parse(
			(ingestCall as unknown as [string, RequestInit])[1].body as string,
		) as Array<Record<string, unknown>>
		expect(body.length).toBe(1)
		expect(body[0]?.level).toBe("info")
		expect(body[0]?.endpoint).toBe("/users/1")
		expect(body[0]?.method).toBe("GET")
		expect(body[0]?.status).toBe(200)
	})

	test("createFetcher integration: ships error entry on APIError", async () => {
		const cfg = uniqueCfg({ batchSize: 1 })
		const fetchMock = mock(async (url: string) => {
			if (url === cfg.url) return new Response("{}", { status: 200 })
			return {
				ok: false,
				status: 500,
				statusText: "boom",
				headers: new Headers({ "content-type": "application/json" }),
				json: async () => ({ message: "boom" }),
			} as Response
		})
		// @ts-expect-error
		globalThis.fetch = fetchMock

		const fetcher = createFetcher("https://api.example.com", { logger: cfg })
		try {
			await fetcher("users")()
		} catch {}

		await new Promise((r) => setTimeout(r, 0))
		const ingestCall = fetchMock.mock.calls.find(
			(c) => (c[0] as string) === cfg.url,
		)
		expect(ingestCall).toBeDefined()
		const body = JSON.parse(
			(ingestCall as unknown as [string, RequestInit])[1].body as string,
		) as Array<Record<string, unknown>>
		expect(body[0]?.level).toBe("error")
		expect(body[0]?.status).toBe(500)
		expect(body[0]?.error_message).toBe("boom")
	})
})
