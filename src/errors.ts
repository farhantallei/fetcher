export class APIError extends Error {
	status: number
	url: string
	info?: unknown
	log: string

	constructor(message: string, url: string, status: number, info?: unknown) {
		super(message)
		this.name = "APIError"
		this.url = url
		this.status = status
		this.info = info
		this.log = this.formatLog(info)

		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, APIError)
		}
	}

	private formatLog(info: unknown): string {
		if (info === null || info === undefined) return "No additional info"
		if (typeof info === "string") return info
		if (typeof info === "object") {
			try {
				return JSON.stringify(info, null, 2)
			} catch {
				return "[Non-Serializable Object]"
			}
		}
		return String(info)
	}

	isClientError(): boolean {
		return this.status >= 400 && this.status < 500
	}

	isServerError(): boolean {
		return this.status >= 500
	}

	isBadRequest(): boolean {
		return this.status === 400
	}

	isUnauthorized(): boolean {
		return this.status === 401
	}

	isForbidden(): boolean {
		return this.status === 403
	}

	isNotFound(): boolean {
		return this.status === 404
	}
}
