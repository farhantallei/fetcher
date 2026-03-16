import { createBaseFetcher } from "./core"
import { APIError } from "./errors"
import type { Fetcher, FetcherConfig } from "./types"
import { getPathname } from "./utils"

export function createFetcher(
	baseUrl: string,
	config?: FetcherConfig,
): Fetcher {
	const baseFetch = createBaseFetcher(
		baseUrl,
		{ "Content-Type": "application/json" },
		config?.interceptor,
	)

	return <T>(...endpoint: string[]) => {
		const pathname = getPathname(...endpoint)
		return async (options?: RequestInit) => {
			try {
				return await baseFetch<T>(pathname, options)
			} catch (error) {
				if (error instanceof APIError) {
					config?.onError?.({ type: "api", error })
				} else {
					config?.onError?.({ type: "unknown", error })
				}
				throw error
			}
		}
	}
}

export function createFormDataFetcher(
	baseUrl: string,
	config?: FetcherConfig,
): Fetcher {
	const baseFetch = createBaseFetcher(baseUrl, {}, config?.interceptor)

	return <T>(...endpoint: string[]) => {
		const pathname = getPathname(...endpoint)
		return async (options?: RequestInit) => {
			try {
				return await baseFetch<T>(pathname, options)
			} catch (error) {
				if (error instanceof APIError) {
					config?.onError?.({ type: "api", error })
				} else {
					config?.onError?.({ type: "unknown", error })
				}
				throw error
			}
		}
	}
}
