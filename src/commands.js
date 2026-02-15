export function resolveCommandTarget(command, settings) {
    if (command === "open-launcher") {
        return { type: "launcher" };
    }

    if (command === "open-options") {
        return { type: "options" };
    }

    const slotMatch = command.match(/^run-slot-(\d)$/);
    if (!slotMatch) {
        return { type: "none" };
    }

    const slot = slotMatch[1];
    const mode = settings.shortcutMode || "launcher";
    const bookmarkletId = settings.slotBindings?.[slot] || "";

    if (mode === "launcher") {
        return { type: "launcher" };
    }

    if (bookmarkletId) {
        return { type: "run", bookmarkletId };
    }

    if (mode === "both") {
        return { type: "launcher" };
    }

    return {
        type: "none",
        message: `No bookmarklet is assigned to slot ${slot}.`
    };
}