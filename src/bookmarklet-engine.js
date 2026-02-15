const RESTRICTED_PREFIXES = ["chrome://", "chrome-extension://", "edge://", "about:", "arc://"];

function isRestrictedUrl(url) {
    if (!url) {
        return true;
    }
    return RESTRICTED_PREFIXES.some((prefix) => url.startsWith(prefix));
}

export async function runBookmarkletOnActiveTab(bookmarklet) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id) {
        return { ok: false, message: "Active tab not found." };
    }

    if (isRestrictedUrl(tab.url || "")) {
        return {
            ok: false,
            message: "This page does not allow script execution (arc://, chrome://, etc.)."
        };
    }

    try {
        const [execution] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            world: "MAIN",
            args: [bookmarklet.code],
            func: (code) => {
                try {
                    const fn = new Function(code);
                    const output = fn.call(window);
                    return {
                        ok: true,
                        mode: "function",
                        output: output === undefined ? null : String(output)
                    };
                } catch (functionError) {
                    try {
                        const script = document.createElement("script");
                        script.textContent = code;
                        (document.head || document.documentElement).appendChild(script);
                        script.remove();
                        return {
                            ok: true,
                            mode: "script-tag",
                            output: null
                        };
                    } catch (injectError) {
                        return {
                            ok: false,
                            message: injectError?.message || functionError?.message || "Execution failed"
                        };
                    }
                }
            }
        });

        if (!execution?.result?.ok) {
            return {
                ok: false,
                message: execution?.result?.message || "Execution failed"
            };
        }

        return {
            ok: true,
            message: "Bookmarklet executed.",
            mode: execution.result.mode,
            output: execution.result.output
        };
    } catch (error) {
        return {
            ok: false,
            message: error?.message || "Failed to inject script"
        };
    }
}