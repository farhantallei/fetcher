import type { LogEntry, LogEntryBase, LoggerConfig } from "./types"

const DEFAULT_REDACT = ["Authorization", "App-Key", "Cookie"]
const DEFAULT_BATCH_SIZE = 20
const DEFAULT_FLUSH_MS = 2000
const STORE_SYMBOL = Symbol.for("@farhantallei/fetcher.loggerStore.v1")

type QueueState = {
	entries: LogEntry[]
	timer: ReturnType<typeof setTimeout> | null
}

type Store = Map<string, QueueState>

function getStore(): Store {
	const g = globalThis as unknown as Record<symbol, Store | undefined>
	let s = g[STORE_SYMBOL]
	if (!s) {
		s = new Map()
		g[STORE_SYMBOL] = s
	}
	return s
}

function keyFor(cfg: LoggerConfig): string {
	return `${cfg.url}::${cfg.token}`
}

function redactCurl(curl: string, headers: string[]): string {
	let out = curl
	for (const h of headers) {
		const escaped = h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
		const re = new RegExp(`(-H\\s+"${escaped}:\\s*)[^"]*(")`, "gi")
		out = out.replace(re, "$1***$2")
	}
	return out
}

async function flush(cfg: LoggerConfig, state: QueueState): Promise<void> {
	if (state.timer) {
		clearTimeout(state.timer)
		state.timer = null
	}
	if (state.entries.length === 0) return
	const batch = state.entries.splice(0, state.entries.length)
	try {
		await fetch(cfg.url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${cfg.token}`,
			},
			body: JSON.stringify(batch),
		})
	} catch {
		// fire-and-forget; never break user flow
	}
}

export async function shipLog(
	cfg: LoggerConfig,
	base: Omit<LogEntryBase, "dt" | "message">,
): Promise<void> {
	const redact = cfg.redactHeaders ?? DEFAULT_REDACT
	const batchSize = cfg.batchSize ?? DEFAULT_BATCH_SIZE
	const flushMs = cfg.flushMs ?? DEFAULT_FLUSH_MS

	const extras = cfg.extraFields ? await cfg.extraFields() : {}

	const entry: LogEntry = {
		...base,
		...extras,
		curl: redactCurl(base.curl, redact),
		dt: new Date().toISOString(),
		message: "",
	}

	entry.message = cfg.messageFormat
		? cfg.messageFormat(entry)
		: `${entry.method} ${entry.endpoint} ${entry.status ?? "ERR"}`

	const store = getStore()
	const key = keyFor(cfg)
	let state = store.get(key)
	if (!state) {
		state = { entries: [], timer: null }
		store.set(key, state)
	}

	state.entries.push(entry)

	if (state.entries.length >= batchSize) {
		void flush(cfg, state)
	} else if (state.timer === null) {
		state.timer = setTimeout(() => {
			void flush(cfg, state)
		}, flushMs)
	}
}

export async function flushLogger(cfg: LoggerConfig): Promise<void> {
	const state = getStore().get(keyFor(cfg))
	if (state) await flush(cfg, state)
}
