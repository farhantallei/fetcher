export type FetcherInterceptor = (
	options: RequestInit,
	url: string,
) => Promise<RequestInit> | RequestInit

export interface FetcherOptions extends RequestInit {}
