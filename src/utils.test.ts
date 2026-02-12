import { describe, expect, it } from "bun:test"

import { buildFormData, buildQueryParams, getPathname } from "./utils"

describe("buildQueryParams", () => {
	it("buildQueryParams encodes", () => {
		expect(
			buildQueryParams({
				a: 1,
				b: null,
				c: "hello world",
				arr: [1, 2],
			}),
		).toBe("?a=1&c=hello%20world&arr=1&arr=2")
	})
})

describe("buildFormData", () => {
	it("handles values", () => {
		const file1 = new File(["abc"], "file1.txt", { type: "text/plain" })
		const file2 = new File(["xyz"], "file2.txt", { type: "text/plain" })
		const date = new Date("2020-01-01T00:00:00.000Z")
		const formData = buildFormData({
			name: "John",
			age: 30,
			active: false,
			list: [file1, date, { a: 1, b: null }, "plain", null],
			single: file2,
			skipNull: null,
			skipUndefined: undefined,
		})
		expect(Array.from(formData.entries())).toEqual([
			["name", "John"],
			["age", "30"],
			["active", "false"],
			["list", file1 as unknown as string],
			["list", date.toISOString()],
			["list[2][a]", "1"],
			["list", "plain"],
			["single", file2 as unknown as string],
		])
	})

	it("skips empty file (size 0)", () => {
		const emptyFile = new File([], "", { type: "application/octet-stream" })
		const validFile = new File(["content"], "valid.txt", { type: "text/plain" })
		const formData = buildFormData({
			empty: emptyFile,
			valid: validFile,
		})
		expect(Array.from(formData.entries())).toEqual([
			["valid", validFile as unknown as string],
		])
	})
})

describe("getPathname utility function", () => {
	// Single endpoint
	it("should return single endpoint as is", () => {
		expect(getPathname("users")).toBe("/users")
		expect(getPathname("api")).toBe("/api")
	})

	// Multiple endpoints
	it("should join multiple endpoints with slash", () => {
		expect(getPathname("api", "users")).toBe("/api/users")
		expect(getPathname("api", "v1", "users")).toBe("/api/v1/users")
		expect(getPathname("api", "v1", "users", "123")).toBe("/api/v1/users/123")
	})

	// Endpoint starting with slash
	it("should handle endpoint starting with slash", () => {
		expect(getPathname("api", "/users")).toBe("/api/users")
		expect(getPathname("api", "v1", "/users")).toBe("/api/v1/users")
	})

	// Query parameters
	it("should preserve query parameters in last endpoint", () => {
		expect(getPathname("users", "?page=1")).toBe("/users?page=1")
		expect(getPathname("api", "users", "?id=123&name=john")).toBe(
			"/api/users?id=123&name=john",
		)
		expect(getPathname("api", "users", "?page=1&limit=10")).toBe(
			"/api/users?page=1&limit=10",
		)
		expect(getPathname("?page=1")).toBe("?page=1")
	})

	// Trailing slashes
	it("should remove trailing slashes", () => {
		expect(getPathname("api/")).toBe("/api")
		expect(getPathname("api", "users/")).toBe("/api/users")
		expect(getPathname("api", "v1", "users/")).toBe("/api/v1/users")
	})

	// Root slash
	it("should handle root slash", () => {
		expect(getPathname("/")).toBe("")
		expect(getPathname("api", "/")).toBe("/api")
	})

	// Empty strings
	it("should handle empty strings", () => {
		expect(getPathname("api", "", "users")).toBe("/api/users")
		expect(getPathname("api", "users", "")).toBe("/api/users")
	})

	// Multiple consecutive slashes
	it("should handle multiple consecutive slashes", () => {
		expect(getPathname("api", "//users")).toBe("/api/users")
		expect(getPathname("api/", "/users")).toBe("/api/users")
	})

	// Relative paths
	it("should handle relative path prefix", () => {
		expect(getPathname("./api")).toBe("/api")
		expect(getPathname("./api", "users")).toBe("/api/users")
		expect(getPathname("..", "api", "users")).toBe("/api/users")
	})

	// Complex paths
	it("should work with complex paths", () => {
		expect(getPathname("api", "v1", "users", "123/")).toBe("/api/v1/users/123")
	})

	// Special characters
	it("should handle special characters in path", () => {
		expect(getPathname("api", "users-list")).toBe("/api/users-list")
		expect(getPathname("api", "v1.0", "users")).toBe("/api/v1.0/users")
	})
})
