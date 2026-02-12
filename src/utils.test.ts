import { describe, expect, it } from "bun:test"

import { getPathname } from "./utils"

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
