import { runRequest } from "./core"
import { APIError } from "./errors"
import { shipLog } from "./logger"
import type {
	ErrorContext,
	ErrorListener,
	Fetcher,
	FetcherConfig,
	ResponseContext,
	ResponseListener,
} from "./types"
import { buildCurl, buildCurlFormData, getPathname } from "./utils"

type HeadersInit =
	| string[][]
	| Record<string, string | ReadonlyArray<string>>
	| Headers

type CurlBuilder = (args: { url: string; options?: RequestInit }) => string

function endpointOf(url: string): string {
	try {
		const u = new URL(url)
		return u.pathname + u.search
	} catch {
		return url
	}
}

function makeFactory(
	baseUrl: string,
	defaultHeaders: HeadersInit,
	curlBuilder: CurlBuilder,
	config?: FetcherConfig,
): Fetcher {
	const interceptor = config?.interceptor
	const userOnResponse = config?.onResponse
	const userOnError = config?.onError
	const logger = config?.logger

	const onResponse: ResponseListener | undefined = logger
		? async (ctx: ResponseContext) => {
				if (userOnResponse) await userOnResponse(ctx)
				await shipLog(logger, {
					level: "info",
					endpoint: endpointOf(ctx.url),
					method: (ctx.options.method ?? "GET").toUpperCase(),
					status: ctx.status,
					duration_ms: ctx.duration_ms,
					ttfb_ms: ctx.ttfb_ms,
					curl: ctx.curl,
				})
			}
		: userOnResponse

	const onError: ErrorListener | undefined = logger
		? async (ctx: ErrorContext) => {
				if (userOnError) await userOnError(ctx)
				const info = ctx.error instanceof APIError ? ctx.error.info : undefined
				await shipLog(logger, {
					level: "error",
					endpoint: endpointOf(ctx.url),
					method: (ctx.options.method ?? "GET").toUpperCase(),
					status: ctx.status,
					duration_ms: ctx.duration_ms,
					ttfb_ms: ctx.ttfb_ms,
					curl: ctx.curl,
					error_message: ctx.error.message,
					error_info: info,
				})
			}
		: userOnError

	return <T>(...endpoint: string[]) => {
		const pathname = getPathname(...endpoint)
		const url = `${baseUrl}${pathname}`
		return (options?: RequestInit) =>
			runRequest<T>({
				url,
				options,
				defaultHeaders,
				interceptor,
				curlBuilder,
				onResponse,
				onError,
			})
	}
}

export function createFetcher(
	baseUrl: string,
	config?: FetcherConfig,
): Fetcher {
	return makeFactory(
		baseUrl,
		{ "Content-Type": "application/json" },
		buildCurl,
		config,
	)
}

export function createFormDataFetcher(
	baseUrl: string,
	config?: FetcherConfig,
): Fetcher {
	return makeFactory(baseUrl, {}, buildCurlFormData, config)
}
