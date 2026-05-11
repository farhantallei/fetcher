import { APIError } from "./errors"
import type {
	ErrorListener,
	FetcherInterceptor,
	ResponseListener,
} from "./types"

type HeadersInit =
	| string[][]
	| Record<string, string | ReadonlyArray<string>>
	| Headers

type CurlBuilder = (args: { url: string; options?: RequestInit }) => string

type RunRequestOptions = {
	url: string
	options?: RequestInit
	defaultHeaders: HeadersInit
	interceptor?: FetcherInterceptor
	curlBuilder?: CurlBuilder
	onResponse?: ResponseListener
	onError?: ErrorListener
}

function fireAndForget(p: void | Promise<void>): void {
	if (p && typeof (p as Promise<void>).then === "function") {
		;(p as Promise<void>).catch(() => {})
	}
}

export async function runRequest<T>(opts: RunRequestOptions): Promise<T> {
	const {
		url,
		options,
		defaultHeaders,
		interceptor,
		curlBuilder,
		onResponse,
		onError,
	} = opts

	let finalOptions: RequestInit = {
		...options,
		headers: {
			...(defaultHeaders as Record<string, string>),
			...(options?.headers as Record<string, string>),
		},
	}

	if (interceptor) finalOptions = await interceptor(finalOptions, url)

	const curl = curlBuilder ? curlBuilder({ url, options: finalOptions }) : ""
	const start = performance.now()
	let ttfb: number | null = null
	let apiErrorFired = false

	try {
		const res = await fetch(url, finalOptions)
		ttfb = performance.now() - start

		const isJson = res.headers.get("content-type")?.includes("application/json")

		const data: unknown = isJson ? await res.json() : await res.text()
		const duration = performance.now() - start

		if (!res.ok) {
			const message =
				(isJson && (data as { message?: string })?.message) ||
				res.statusText ||
				"Unknown API error"
			const err = new APIError(message, url, res.status, data)
			apiErrorFired = true
			if (onError) {
				fireAndForget(
					onError({
						url,
						options: finalOptions,
						status: res.status,
						duration_ms: duration,
						ttfb_ms: ttfb,
						curl,
						error: err,
					}),
				)
			}
			throw err
		}

		if (onResponse) {
			fireAndForget(
				onResponse({
					url,
					options: finalOptions,
					status: res.status,
					duration_ms: duration,
					ttfb_ms: ttfb,
					curl,
				}),
			)
		}

		if (res.status === 204) return null as T
		return data as T
	} catch (error) {
		if (apiErrorFired) throw error
		const duration = performance.now() - start
		if (onError) {
			fireAndForget(
				onError({
					url,
					options: finalOptions,
					status: null,
					duration_ms: duration,
					ttfb_ms: ttfb,
					curl,
					error: error instanceof Error ? error : new Error(String(error)),
				}),
			)
		}
		throw error
	}
}

export function createBaseFetcher(
	baseUrl: string,
	defaultHeaders: HeadersInit = {},
	interceptor?: FetcherInterceptor,
) {
	return <T>(pathname: string, options?: RequestInit): Promise<T> =>
		runRequest<T>({
			url: `${baseUrl}${pathname}`,
			options,
			defaultHeaders,
			interceptor,
		})
}
