import type { APIError } from "./errors"

export type FetcherInterceptor = (
	options: RequestInit,
	url: string,
) => Promise<RequestInit> | RequestInit

export interface FetcherOptions extends RequestInit {}

export type Fetcher = <T>(
	...endpoint: string[]
) => (options?: RequestInit) => Promise<T>

export type ResponseContext = {
	url: string
	options: RequestInit
	status: number
	duration_ms: number
	ttfb_ms: number
	curl: string
}

export type ErrorContext = {
	url: string
	options: RequestInit
	status: number | null
	duration_ms: number
	ttfb_ms: number | null
	curl: string
	error: APIError | Error
}

export type LogEntryBase = {
	dt: string
	level: "info" | "warn" | "error"
	message: string
	endpoint: string
	method: string
	status: number | null
	duration_ms: number
	ttfb_ms: number | null
	curl: string
	error_message?: string
	error_info?: unknown
}

export type LogEntry = LogEntryBase & Record<string, unknown>

export type LoggerConfig = {
	url: string
	token: string
	redactHeaders?: string[]
	batchSize?: number
	flushMs?: number
	extraFields?: () => Promise<Record<string, unknown>> | Record<string, unknown>
	messageFormat?: (entry: LogEntry) => string
}

export type ResponseListener = (ctx: ResponseContext) => void | Promise<void>

export type ErrorListener = (ctx: ErrorContext) => void | Promise<void>

export interface FetcherConfig {
	interceptor?: FetcherInterceptor
	onResponse?: ResponseListener
	onError?: ErrorListener
	logger?: LoggerConfig
}
