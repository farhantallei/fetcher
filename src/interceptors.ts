import type { FetcherInterceptor } from "./types"

export const createInterceptor =
	(newOptions: RequestInit): FetcherInterceptor =>
	async (options) => {
		return {
			...options,
			...newOptions,
			headers: {
				...(options.headers ?? {}),
				...(newOptions.headers ?? {}),
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
