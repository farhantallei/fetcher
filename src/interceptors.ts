import type { FetcherInterceptor } from "./types"

export const createInterceptor =
	(
		newOptions: RequestInit | (() => Promise<RequestInit> | RequestInit),
	): FetcherInterceptor =>
	async (options) => {
		let resolvedOptions: RequestInit

		if (typeof newOptions === "function") {
			resolvedOptions = await newOptions()
		} else resolvedOptions = newOptions

		return {
			...options,
			...resolvedOptions,
			headers: {
				...(options.headers ?? {}),
				...(resolvedOptions.headers ?? {}),
			},
		}
	}

export const loggingInterceptor: FetcherInterceptor = async (options) => {
	console.log("[Fetcher] Request:", options)
	return options
}

export const composeInterceptors = (
	...interceptors: FetcherInterceptor[]
): FetcherInterceptor => {
	return async (options) => {
		let result = options
		for (const interceptor of interceptors) {
			result = await interceptor(result)
		}
		return result
	}
}
