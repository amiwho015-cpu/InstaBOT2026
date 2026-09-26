const log = require('../logger/log.js');

/**
 * Bridge between the V2 consolidated logger and the local utils/logger.
 * This ensures consistency across the codebase.
 *
 * Winston's printf only understands object meta. Callers routinely pass an
 * Error or a plain string as the second argument
 * (logger.warn("msg:", err?.message || err)), which previously produced log
 * lines ending in a bare colon with the reason silently dropped (or an empty
 * `{}` meta). Normalize everything here so the reason always appears.
 */

function stringifyDetail(value) {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (value instanceof Error) return value.stack || (value.message || value.name || 'Error');
    if (typeof value === 'object') {
        try {
            const json = JSON.stringify(value);
            return json === '{}' || json === '[]' ? String(value) : json;
        } catch (_) {
            return String(value);
        }
    }
    return String(value);
}

function normalizeArgs(args) {
    // Supported forms:
    //   (message)                 -> plain message
    //   (message, detail)         -> "message detail"
    //   (message, error)          -> "message Error: stack/message"
    //   (message, metaObject)     -> message + structured meta preserved
    //   (tag, message, detail)    -> first arg kept in the message for context
    const parts = args.filter(a => a !== undefined && a !== null);
    if (parts.length === 0) return { message: '' };
    if (parts.length === 1) return { message: stringifyDetail(parts[0]) };

    const second = parts[1];

    // (message, metaObject) — a plain object that is NOT an Error is
    // structured metadata (e.g. { url, error }) and must survive as meta so
    // the JSON file logs keep the fields.
    if (
        parts.length === 2 &&
        second && typeof second === 'object' && !(second instanceof Error)
    ) {
        return { message: stringifyDetail(parts[0]), meta: second };
    }

    const detailPieces = parts.slice(1).map(stringifyDetail).filter(Boolean);
    let base = stringifyDetail(parts[0]).replace(/\s+:$/, ''); // drop "msg:" when no reason follows
    if (detailPieces.length) {
        base = base.endsWith(':') ? `${base} ${detailPieces.join(' ')}` : `${base}: ${detailPieces.join(' ')}`;
    }
    return { message: base };
}

function make(level) {
    return (...args) => {
        const { message, meta } = normalizeArgs(args);
        if (meta) log[level](message, meta);
        else log[level](message);
    };
}

module.exports = {
    info: make('info'),
    success: make('success'),
    warn: make('warn'),
    error: make('error'),
    debug: make('debug'),
    command: (name, user, ok = true) => {
        const message = `${name} executed by ${user}`;
        if (ok) log.success('COMMAND', message);
        else log.error('COMMAND', message);
    }
};
