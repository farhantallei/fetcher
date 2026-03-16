import type { APIError } from "./errors"

export type FetcherInterceptor = (
	options: RequestInit,
	url: string,
) => Promise<RequestInit> | RequestInit

export interface FetcherOptions extends RequestInit {}

export type Fetcher = <T>(
	...endpoint: string[]
) => (options?: RequestInit) => Promise<T>

export type FetcherError =
	| { type: "api"; error: APIError }
	| { type: "unknown"; error: unknown }

export type FetcherErrorListener = (error: FetcherError) => void

export interface FetcherConfig {
	interceptor?: FetcherInterceptor
	onError?: FetcherErrorListener
}
