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
		const resolvedOptions: RequestInit =
			typeof newOptions === "function"
				? await newOptions(options, url)
				: newOptions

		return {
			...resolvedOptions,
			...options,
			headers: {
				...(resolvedOptions.headers ?? {}),
				...(options.headers ?? {}),
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
