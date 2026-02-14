import type { FetcherInterceptor } from "./types"

export const createInterceptor =
	(
		newOptions:
			| RequestInit
			| ((
					options: RequestInit,
					url: string,
			  ) => Promise<RequestInit> | RequestInit),
	): FetcherInterceptor =>
	async (options, url) => {
		let resolvedOptions: RequestInit

		if (typeof newOptions === "function") {
			resolvedOptions = await newOptions(options, url)
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
	return async (options, url) => {
		let result = options
		for (const interceptor of interceptors) {
			result = await interceptor(result, url)
		}
		return result
	}
}
