export function nowIso() {
    return new Date().toISOString();
}

export function createId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function normalizeCodeInput(input) {
    const raw = String(input ?? "").trim();
    if (!raw.toLowerCase().startsWith("javascript:")) {
        return raw;
    }

    const body = raw.slice("javascript:".length).trim();
    try {
        return decodeURIComponent(body);
    } catch {
        return body;
    }
}

export function normalizeTags(input) {
    if (Array.isArray(input)) {
        return input
            .map((tag) => String(tag).trim())
            .filter(Boolean)
            .filter((tag, index, self) => self.indexOf(tag) === index);
    }

    return String(input ?? "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .filter((tag, index, self) => self.indexOf(tag) === index);
}

export function safeName(input) {
    return String(input ?? "").trim().slice(0, 120);
}

export function sortForLauncher(items) {
    return [...items].sort((left, right) => {
        if (left.favorite !== right.favorite) {
            return left.favorite ? -1 : 1;
        }

        const leftUse = left.lastUsedAt ? Date.parse(left.lastUsedAt) : 0;
        const rightUse = right.lastUsedAt ? Date.parse(right.lastUsedAt) : 0;
        if (leftUse !== rightUse) {
            return rightUse - leftUse;
        }

        return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
    });
}