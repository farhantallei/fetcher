export type FetcherInterceptor = (
	options: RequestInit,
	url: string,
) => Promise<RequestInit> | RequestInit

export interface FetcherOptions extends RequestInit {}

export type Fetcher = <T>(...endpoint: string[]) => (options?: RequestInit) => Promise<T>
