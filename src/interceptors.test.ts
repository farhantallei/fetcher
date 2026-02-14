import { describe, expect, mock, test } from "bun:test"

import { composeInterceptors } from "./interceptors"

describe("composeInterceptors", () => {
	test("should compose multiple interceptors", async () => {
		const interceptor1 = mock(async (options: RequestInit) => ({
			...options,
			headers: {
				...options.headers,
				"X-Header-1": "value1",
			},
		}))

		const interceptor2 = mock(async (options: RequestInit) => ({
			...options,
			headers: {
				...options.headers,
				"X-Header-2": "value2",
			},
		}))

		const composed = composeInterceptors(interceptor1, interceptor2)

		const options: RequestInit = {
			headers: { "Content-Type": "application/json" },
		}

		const result = await composed(options, "https://api.example.com")

		expect(result.headers).toEqual({
			"Content-Type": "application/json",
			"X-Header-1": "value1",
			"X-Header-2": "value2",
		})
		expect(interceptor1).toHaveBeenCalledTimes(1)
		expect(interceptor2).toHaveBeenCalledTimes(1)
	})

	test("should execute interceptors in order", async () => {
		const calls: number[] = []

		const interceptor1 = mock(async (options: RequestInit) => {
			calls.push(1)
			return options
		})

		const interceptor2 = mock(async (options: RequestInit) => {
			calls.push(2)
			return options
		})

		const interceptor3 = mock(async (options: RequestInit) => {
			calls.push(3)
			return options
		})

		const composed = composeInterceptors(
			interceptor1,
			interceptor2,
			interceptor3,
		)

		await composed({}, "https://api.example.com")

		expect(calls).toEqual([1, 2, 3])
	})
})
