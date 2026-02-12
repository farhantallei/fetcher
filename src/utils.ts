export function getPathname(...endpoint: string[]) {
	const lastEndpoint = endpoint[endpoint.length - 1]
	const hasQueryParams = lastEndpoint?.startsWith("?")

	if (endpoint.length === 1 && hasQueryParams) {
		return lastEndpoint || ""
	}

	const segments = endpoint
		.flatMap((seg) => seg.split("/"))
		.map((seg) => seg.replace(/^\.+/, ""))
		.filter((seg) => seg !== "" && !seg.startsWith("?"))

	const queryString = hasQueryParams ? lastEndpoint : ""

	const pathname = `/${segments.join("/")}${queryString}`

	return pathname.replace(/\/$/, "")
}

export function buildCurl({
	url,
	options,
	extraHeaders = {},
}: {
	url: string
	options?: RequestInit
	extraHeaders?: Record<string, string | undefined | null>
}): string {
	const method = options?.method || "GET"

	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		...(options?.headers as Record<string, string>),
		...Object.fromEntries(
			Object.entries(extraHeaders).filter(
				([, value]) => value !== undefined && value !== null,
			),
		),
	}

	const body =
		options?.body && typeof options.body === "string"
			? options.body
			: options?.body
				? JSON.stringify(options.body)
				: null

	return [
		`curl -X ${method} "${url}"`,
		...Object.entries(headers).map(([key, value]) => `-H "${key}: ${value}"`),
		body ? `-d '${body.replace(/'/g, `'\\''`)}'` : null,
	]
		.filter(Boolean)
		.join(" \\\n  ")
}

export function buildCurlFormData({
	url,
	options,
	extraHeaders = {},
}: {
	url: string
	options?: RequestInit
	extraHeaders?: Record<string, string | undefined | null>
}): string {
	const method = options?.method || "POST"
	const body = options?.body
	const headers: Record<string, string> = {
		...(options?.headers as Record<string, string>),
		...(Object.fromEntries(
			Object.entries(extraHeaders).filter(
				([, value]) => value !== undefined && value !== null,
			),
		) as Record<string, string>),
	}

	const parts: string[] = [`curl -X ${method} "${url}"`]

	for (const [key, value] of Object.entries(headers)) {
		if (key.toLowerCase() === "content-type") continue
		parts.push(`-H "${key}: ${value}"`)
	}

	if (body instanceof FormData) {
		for (const [key, value] of body.entries()) {
			// biome-ignore lint/suspicious/noExplicitAny: can be File
			const a_value = value as any
			if (a_value instanceof File) {
				parts.push(`-F "${key}=@${a_value.name}"`)
			} else {
				parts.push(`-F "${key}=${a_value}"`)
			}
		}
	} else {
		const fallbackBody = typeof body === "string" ? body : JSON.stringify(body)
		parts.push(`-d '${fallbackBody.replace(/'/g, `'\\''`)}'`)
	}

	return parts.join(" \\\n  ")
}
