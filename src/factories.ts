import { createBaseFetcher } from "./core"
import type { FetcherInterceptor } from "./types"
import { getPathname } from "./utils"

export function createFetcher(
	baseUrl: string,
	interceptor?: FetcherInterceptor,
) {
	const baseFetch = createBaseFetcher(
		baseUrl,
		{ "Content-Type": "application/json" },
		interceptor,
	)

	return <T>(...endpoint: string[]) => {
		const pathname = getPathname(...endpoint)
		return (options?: RequestInit) => baseFetch<T>(pathname, options)
	}
}

export function createFormDataFetcher(
	baseUrl: string,
	interceptor?: FetcherInterceptor,
) {
	const baseFetch = createBaseFetcher(baseUrl, {}, interceptor)

	return <T>(...endpoint: string[]) => {
		const pathname = getPathname(...endpoint)
		return (options?: RequestInit) => baseFetch<T>(pathname, options)
	}
}
