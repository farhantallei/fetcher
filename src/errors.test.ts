import { describe, expect, test } from "bun:test"

import { APIError } from "./errors"

describe("APIError", () => {
	test("should create error with basic info", () => {
		const error = new APIError(
			"Not found",
			"https://api.example.com/users/123",
			404,
		)

		expect(error.name).toBe("APIError")
		expect(error.message).toBe("Not found")
		expect(error.url).toBe("https://api.example.com/users/123")
		expect(error.status).toBe(404)
		expect(error.info).toBeUndefined()
	})

	test("should format log with JSON object", () => {
		const info = { code: "USER_NOT_FOUND", details: "User does not exist" }
		const error = new APIError(
			"Not found",
			"https://api.example.com/users/123",
			404,
			info,
		)

		expect(error.log).toBe(JSON.stringify(info, null, 2))
		expect(error.info).toEqual(info)
	})

	test("should format log with string", () => {
		const error = new APIError(
			"Bad request",
			"https://api.example.com",
			400,
			"Invalid input",
		)

		expect(error.log).toBe("Invalid input")
	})

	test("should format log with null/undefined", () => {
		const error1 = new APIError("Error", "url", 500, null)
		const error2 = new APIError("Error", "url", 500, undefined)

		expect(error1.log).toBe("No additional info")
		expect(error2.log).toBe("No additional info")
	})

	test("should handle circular objects", () => {
		const circular = { name: "test" }
		// @ts-expect-error
		circular.self = circular

		const error = new APIError("Error", "url", 500, circular)

		expect(error.log).toBe("[Non-Serializable Object]")
	})

	test("isClientError should return true for 4xx", () => {
		const error400 = new APIError("Bad request", "url", 400)
		const error404 = new APIError("Not found", "url", 404)
		const error500 = new APIError("Server error", "url", 500)

		expect(error400.isClientError()).toBe(true)
		expect(error404.isClientError()).toBe(true)
		expect(error500.isClientError()).toBe(false)
	})

	test("isServerError should return true for 5xx", () => {
		const error500 = new APIError("Server error", "url", 500)
		const error503 = new APIError("Service unavailable", "url", 503)
		const error400 = new APIError("Bad request", "url", 400)

		expect(error500.isServerError()).toBe(true)
		expect(error503.isServerError()).toBe(true)
		expect(error400.isServerError()).toBe(false)
	})

	test("isUnauthorized should return true for 401", () => {
		const error401 = new APIError("Unauthorized", "url", 401)
		const error403 = new APIError("Forbidden", "url", 403)

		expect(error401.isUnauthorized()).toBe(true)
		expect(error403.isUnauthorized()).toBe(false)
	})

	test("isForbidden should return true for 403", () => {
		const error403 = new APIError("Forbidden", "url", 403)
		const error401 = new APIError("Unauthorized", "url", 401)

		expect(error403.isForbidden()).toBe(true)
		expect(error401.isForbidden()).toBe(false)
	})

	test("isNotFound should return true for 404", () => {
		const error404 = new APIError("Not found", "url", 404)
		const error400 = new APIError("Bad request", "url", 400)

		expect(error404.isNotFound()).toBe(true)
		expect(error400.isNotFound()).toBe(false)
	})
})
