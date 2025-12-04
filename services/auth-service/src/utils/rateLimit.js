const store = new Map();

function checkRateLimit(key, maxRequests, windowMs) {
    const now = Date.now();
    const record = store.get(key) || [];

    const fresh = record.filter(ts => now - ts < windowMs);

    if (fresh.length >= maxRequests) {
        store.set(key, fresh);
        return false;
    }

    fresh.push(now);
    store.set(key, fresh);

    return true;
}

module.exports = { checkRateLimit };
