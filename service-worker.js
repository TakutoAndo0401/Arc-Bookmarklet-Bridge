import { runBookmarkletOnActiveTab } from "./src/bookmarklet-engine.js";
import { resolveCommandTarget } from "./src/commands.js";
import { getBookmarkletById, getSettings, touchBookmarkletUsage } from "./src/storage.js";

async function runById(bookmarkletId) {
    const bookmarklet = await getBookmarkletById(bookmarkletId);
    if (!bookmarklet) {
        return {
            ok: false,
            message: "Bookmarklet not found."
        };
    }

    const result = await runBookmarkletOnActiveTab(bookmarklet);
    if (result.ok) {
        await touchBookmarkletUsage(bookmarkletId);
    }
    return result;
}

chrome.commands.onCommand.addListener(async (command) => {
    const settings = await getSettings();
    const target = resolveCommandTarget(command, settings);

    if (target.type === "launcher") {
        try {
            await chrome.action.openPopup();
        } catch {
            await chrome.runtime.openOptionsPage();
        }
        return;
    }

    if (target.type === "options") {
        await chrome.runtime.openOptionsPage();
        return;
    }

    if (target.type === "run") {
        await runById(target.bookmarkletId);
    }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "RUN_BOOKMARKLET") {
        runById(message.id)
            .then((result) => sendResponse(result))
            .catch((error) => {
                sendResponse({
                    ok: false,
                    message: error?.message || "Unknown error"
                });
            });
        return true;
    }

    if (message?.type === "OPEN_OPTIONS") {
        chrome.runtime.openOptionsPage();
        sendResponse({ ok: true });
        return true;
    }

    return false;
});