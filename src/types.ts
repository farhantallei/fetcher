export type FetcherInterceptor = (
	options: RequestInit,
) => Promise<RequestInit> | RequestInit

export interface FetcherOptions extends RequestInit {}
