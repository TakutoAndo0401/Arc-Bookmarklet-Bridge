import { createId, normalizeCodeInput, normalizeTags, nowIso, safeName } from "./utils.js";

const META_KEY = "bookmarklet_meta_v1";
const CODE_KEY = "bookmarklet_code_v1";
const SETTINGS_KEY = "bookmarklet_settings_v1";

const DEFAULT_SETTINGS = {
    shortcutMode: "launcher",
    slotBindings: {
        "1": "",
        "2": "",
        "3": "",
        "4": ""
    },
    confirmBeforeRun: false,
    launcherMaxItems: 30
};

async function getSyncObject(key, fallback) {
    const data = await chrome.storage.sync.get(key);
    return data[key] ?? fallback;
}

async function getLocalObject(key, fallback) {
    const data = await chrome.storage.local.get(key);
    return data[key] ?? fallback;
}

function normalizeMetaItem(item) {
    const createdAt = item.createdAt || nowIso();
    const updatedAt = item.updatedAt || createdAt;
    return {
        id: String(item.id),
        name: safeName(item.name) || "Untitled",
        tags: normalizeTags(item.tags),
        favorite: Boolean(item.favorite),
        createdAt,
        updatedAt,
        lastUsedAt: item.lastUsedAt || ""
    };
}

async function getMetaState() {
    const state = await getSyncObject(META_KEY, { items: [] });
    const items = Array.isArray(state.items) ? state.items.map(normalizeMetaItem) : [];
    return { items };
}

async function setMetaState(state) {
    await chrome.storage.sync.set({ [META_KEY]: state });
}

async function getCodeMap() {
    const codes = await getLocalObject(CODE_KEY, {});
    return typeof codes === "object" && codes !== null ? { ...codes } : {};
}

async function setCodeMap(codeMap) {
    await chrome.storage.local.set({ [CODE_KEY]: codeMap });
}

export async function getSettings() {
    const state = await getSyncObject(SETTINGS_KEY, DEFAULT_SETTINGS);
    const slotBindings = {
        ...DEFAULT_SETTINGS.slotBindings,
        ...(state.slotBindings || {})
    };

    return {
        ...DEFAULT_SETTINGS,
        ...state,
        slotBindings
    };
}

export async function updateSettings(partialSettings) {
    const current = await getSettings();
    const next = {
        ...current,
        ...partialSettings,
        slotBindings: {
            ...current.slotBindings,
            ...(partialSettings.slotBindings || {})
        }
    };

    await chrome.storage.sync.set({ [SETTINGS_KEY]: next });
    return next;
}

export async function listBookmarklets() {
    const [meta, codes] = await Promise.all([getMetaState(), getCodeMap()]);
    return meta.items.map((item) => ({
        ...item,
        code: String(codes[item.id] ?? "")
    }));
}

export async function getBookmarkletById(id) {
    const items = await listBookmarklets();
    return items.find((item) => item.id === id) || null;
}

export async function createBookmarklet(payload) {
    const now = nowIso();
    const id = createId();

    const item = normalizeMetaItem({
        id,
        name: safeName(payload.name),
        tags: normalizeTags(payload.tags),
        favorite: Boolean(payload.favorite),
        createdAt: now,
        updatedAt: now,
        lastUsedAt: ""
    });

    const [meta, codes] = await Promise.all([getMetaState(), getCodeMap()]);
    meta.items.unshift(item);
    codes[id] = normalizeCodeInput(payload.code);

    await Promise.all([setMetaState(meta), setCodeMap(codes)]);
    return { ...item, code: codes[id] };
}

export async function updateBookmarklet(id, patch) {
    const [meta, codes] = await Promise.all([getMetaState(), getCodeMap()]);
    const index = meta.items.findIndex((item) => item.id === id);
    if (index < 0) {
        throw new Error("Bookmarklet not found");
    }

    const current = meta.items[index];
    const updated = normalizeMetaItem({
        ...current,
        name: patch.name !== undefined ? safeName(patch.name) : current.name,
        tags: patch.tags !== undefined ? normalizeTags(patch.tags) : current.tags,
        favorite: patch.favorite !== undefined ? Boolean(patch.favorite) : current.favorite,
        updatedAt: nowIso(),
        lastUsedAt: current.lastUsedAt
    });

    meta.items[index] = updated;
    if (patch.code !== undefined) {
        codes[id] = normalizeCodeInput(patch.code);
    }

    await Promise.all([setMetaState(meta), setCodeMap(codes)]);
    return {
        ...updated,
        code: String(codes[id] ?? "")
    };
}

export async function deleteBookmarklet(id) {
    const [meta, codes, settings] = await Promise.all([getMetaState(), getCodeMap(), getSettings()]);
    const nextItems = meta.items.filter((item) => item.id !== id);
    if (nextItems.length === meta.items.length) {
        return false;
    }

    const nextCodes = { ...codes };
    delete nextCodes[id];

    const nextBindings = { ...settings.slotBindings };
    Object.keys(nextBindings).forEach((slot) => {
        if (nextBindings[slot] === id) {
            nextBindings[slot] = "";
        }
    });

    await Promise.all([
        setMetaState({ items: nextItems }),
        setCodeMap(nextCodes),
        updateSettings({ slotBindings: nextBindings })
    ]);

    return true;
}

export async function duplicateBookmarklet(id) {
    const source = await getBookmarkletById(id);
    if (!source) {
        throw new Error("Bookmarklet not found");
    }

    return createBookmarklet({
        name: `${source.name} (copy)`,
        tags: source.tags,
        favorite: false,
        code: source.code
    });
}

export async function touchBookmarkletUsage(id) {
    const meta = await getMetaState();
    const index = meta.items.findIndex((item) => item.id === id);
    if (index < 0) {
        return;
    }

    meta.items[index] = {
        ...meta.items[index],
        lastUsedAt: nowIso(),
        updatedAt: nowIso()
    };

    await setMetaState(meta);
}

export async function exportBookmarkletsData() {
    const items = await listBookmarklets();
    return {
        version: 1,
        exportedAt: nowIso(),
        items
    };
}

function normalizeImportedItem(item) {
    const meta = normalizeMetaItem(item);
    return {
        ...meta,
        code: normalizeCodeInput(item.code)
    };
}

export async function importBookmarkletsData(payload, mode = "replace") {
    if (!payload || !Array.isArray(payload.items)) {
        throw new Error("Invalid import format");
    }

    const importedItems = payload.items.map(normalizeImportedItem);
    const [meta, codes] = await Promise.all([getMetaState(), getCodeMap()]);

    const nextMetaItems = mode === "merge" ? [...meta.items] : [];
    const nextCodes = mode === "merge" ? { ...codes } : {};

    importedItems.forEach((item) => {
        const existingIndex = nextMetaItems.findIndex((metaItem) => metaItem.id === item.id);
        if (existingIndex >= 0) {
            nextMetaItems[existingIndex] = {
                ...nextMetaItems[existingIndex],
                ...item,
                updatedAt: nowIso()
            };
        } else {
            nextMetaItems.push(item);
        }
        nextCodes[item.id] = item.code;
    });

    await Promise.all([
        setMetaState({ items: nextMetaItems }),
        setCodeMap(nextCodes)
    ]);

    return importedItems.length;
}