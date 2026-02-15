import { listBookmarklets } from "./src/storage.js";
import { sortForLauncher } from "./src/utils.js";

const searchInput = document.querySelector("#searchInput");
const statusLine = document.querySelector("#status");
const listElement = document.querySelector("#bookmarkletList");
const openOptionsButton = document.querySelector("#openOptionsButton");

let allItems = [];

function setStatus(text, isError = false) {
    statusLine.textContent = text;
    statusLine.classList.toggle("error", isError);
}

function sendMessage(message) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
            const runtimeError = chrome.runtime.lastError;
            if (runtimeError) {
                reject(runtimeError);
                return;
            }
            resolve(response);
        });
    });
}

async function runBookmarklet(id) {
    setStatus("実行中...");

    try {
        const result = await sendMessage({
            type: "RUN_BOOKMARKLET",
            id
        });

        if (!result?.ok) {
            setStatus(result?.message || "実行に失敗しました。", true);
            return;
        }

        const suffix = result.mode ? ` (${result.mode})` : "";
        setStatus(`実行しました${suffix}`);
    } catch (error) {
        setStatus(error?.message || "実行に失敗しました。", true);
    }
}

function renderList() {
    const term = searchInput.value.trim().toLowerCase();
    const filtered = allItems.filter((item) => {
        const name = item.name.toLowerCase();
        const tags = item.tags.join(" ").toLowerCase();
        return name.includes(term) || tags.includes(term);
    });

    listElement.innerHTML = "";

    if (!filtered.length) {
        const empty = document.createElement("li");
        empty.className = "empty-line";
        empty.textContent = "ブックマークレットがありません。管理画面で作成してください。";
        listElement.appendChild(empty);
        return;
    }

    filtered.forEach((item) => {
        const li = document.createElement("li");
        li.className = "bookmarklet-item";

        const name = document.createElement("button");
        name.type = "button";
        name.className = "item-run-button";
        name.textContent = item.favorite ? `★ ${item.name}` : item.name;
        name.addEventListener("click", () => runBookmarklet(item.id));

        const meta = document.createElement("span");
        meta.className = "item-meta";
        meta.textContent = item.tags.length ? item.tags.join(", ") : "no tags";

        li.appendChild(name);
        li.appendChild(meta);
        listElement.appendChild(li);
    });
}

async function initialize() {
    allItems = sortForLauncher(await listBookmarklets());
    renderList();
    setStatus(allItems.length ? "" : "初回セットアップ: 管理画面で追加してください。");
}

searchInput.addEventListener("input", renderList);

openOptionsButton.addEventListener("click", async () => {
    await sendMessage({ type: "OPEN_OPTIONS" });
});

initialize().catch((error) => {
    setStatus(error?.message || "読み込みに失敗しました。", true);
});