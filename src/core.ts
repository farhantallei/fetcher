import { APIError } from "./errors"
import type { FetcherInterceptor } from "./types"

// import { buildCurl, buildCurlFormData } from "./utils";

type HeadersInit =
	| string[][]
	| Record<string, string | ReadonlyArray<string>>
	| Headers

export function createBaseFetcher(
	baseUrl: string,
	defaultHeaders: HeadersInit = {},
	interceptor?: FetcherInterceptor,
) {
	return async <T>(pathname: string, options?: RequestInit): Promise<T> => {
		const url = `${baseUrl}${pathname}`

		let finalOptions: RequestInit = {
			...options,
			headers: {
				...defaultHeaders,
				...options?.headers,
			},
		}

		if (interceptor) {
			finalOptions = await interceptor(finalOptions, url)
		}

		// console.log(url);
		// console.log(finalOptions);

		const res = await fetch(url, finalOptions)

		// const body = finalOptions.body;
		//
		// if (body && body instanceof FormData) {
		// 	const curl = buildCurlFormData({ url, options: finalOptions });
		// 	console.log(curl);
		// } else {
		// 	const curl = buildCurl({ url, options: finalOptions });
		// 	console.log(curl);
		// }

		let data: unknown = null
		const isJson = res.headers.get("content-type")?.includes("application/json")

		if (isJson) {
			data = await res.json()
		} else {
			data = await res.text()
		}

		if (!res.ok) {
			const message =
				(isJson && (data as { message?: string })?.message) ||
				res.statusText ||
				"Unknown API error"
			throw new APIError(message, url, res.status, data)
		}

		if (res.status === 204) return null as T
		return data as T
	}
}
