import {
    createBookmarklet,
    deleteBookmarklet,
    duplicateBookmarklet,
    exportBookmarkletsData,
    getSettings,
    importBookmarkletsData,
    listBookmarklets,
    updateBookmarklet,
    updateSettings
} from "./src/storage.js";
import { sortForLauncher } from "./src/utils.js";

const form = document.querySelector("#bookmarkletForm");
const bookmarkletIdInput = document.querySelector("#bookmarkletId");
const nameInput = document.querySelector("#nameInput");
const tagsInput = document.querySelector("#tagsInput");
const favoriteInput = document.querySelector("#favoriteInput");
const codeInput = document.querySelector("#codeInput");
const clearButton = document.querySelector("#clearButton");
const filterInput = document.querySelector("#filterInput");
const listContainer = document.querySelector("#listContainer");
const shortcutModeSelect = document.querySelector("#shortcutModeSelect");
const confirmBeforeRunInput = document.querySelector("#confirmBeforeRunInput");
const exportButton = document.querySelector("#exportButton");
const importModeSelect = document.querySelector("#importModeSelect");
const importFileInput = document.querySelector("#importFileInput");
const statusLine = document.querySelector("#status");

const slotSelectMap = {
    "1": document.querySelector("#slot1Select"),
    "2": document.querySelector("#slot2Select"),
    "3": document.querySelector("#slot3Select"),
    "4": document.querySelector("#slot4Select")
};

const state = {
    items: [],
    settings: null
};

function setStatus(text, isError = false) {
    statusLine.textContent = text;
    statusLine.classList.toggle("error", isError);
}

function parseTags(text) {
    return text
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
}

function formatDate(isoText) {
    if (!isoText) {
        return "-";
    }
    const date = new Date(isoText);
    if (Number.isNaN(date.valueOf())) {
        return "-";
    }
    return date.toLocaleString();
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

function clearForm() {
    bookmarkletIdInput.value = "";
    form.reset();
    favoriteInput.checked = false;
}

function fillForm(item) {
    bookmarkletIdInput.value = item.id;
    nameInput.value = item.name;
    tagsInput.value = item.tags.join(", ");
    favoriteInput.checked = item.favorite;
    codeInput.value = item.code;
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderSlotOptions() {
    const optionSource = state.items;

    Object.entries(slotSelectMap).forEach(([slot, selectElement]) => {
        const selected = state.settings.slotBindings?.[slot] || "";
        selectElement.innerHTML = "";

        const emptyOption = document.createElement("option");
        emptyOption.value = "";
        emptyOption.textContent = "未設定";
        selectElement.appendChild(emptyOption);

        optionSource.forEach((item) => {
            const option = document.createElement("option");
            option.value = item.id;
            option.textContent = item.name;
            selectElement.appendChild(option);
        });

        selectElement.value = selected;
    });
}

function renderList() {
    const keyword = filterInput.value.trim().toLowerCase();
    const rows = state.items.filter((item) => {
        if (!keyword) {
            return true;
        }

        const name = item.name.toLowerCase();
        const tags = item.tags.join(" ").toLowerCase();
        return name.includes(keyword) || tags.includes(keyword);
    });

    if (!rows.length) {
        listContainer.innerHTML = '<p class="empty-line">一致するブックマークレットがありません。</p>';
        return;
    }

    const table = document.createElement("table");
    table.className = "item-table";

    const thead = document.createElement("thead");
    thead.innerHTML = "<tr><th>名前</th><th>タグ</th><th>更新日</th><th>操作</th></tr>";
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    rows.forEach((item) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
      <td>${item.favorite ? "★ " : ""}${item.name}</td>
      <td>${item.tags.join(", ") || "-"}</td>
      <td>${formatDate(item.updatedAt)}</td>
      <td>
        <div class="action-row">
          <button type="button" data-action="run" data-id="${item.id}">実行</button>
          <button type="button" data-action="edit" data-id="${item.id}">編集</button>
          <button type="button" data-action="duplicate" data-id="${item.id}">複製</button>
          <button type="button" data-action="favorite" data-id="${item.id}">${item.favorite ? "☆" : "★"}</button>
          <button type="button" data-action="delete" data-id="${item.id}">削除</button>
        </div>
      </td>
    `;
        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    listContainer.innerHTML = "";
    listContainer.appendChild(table);
}

async function refresh() {
    const [items, settings] = await Promise.all([listBookmarklets(), getSettings()]);
    state.items = sortForLauncher(items);
    state.settings = settings;

    shortcutModeSelect.value = settings.shortcutMode;
    confirmBeforeRunInput.checked = Boolean(settings.confirmBeforeRun);

    renderSlotOptions();
    renderList();
}

async function runItem(id) {
    if (state.settings.confirmBeforeRun) {
        const shouldRun = window.confirm("このブックマークレットを実行しますか？");
        if (!shouldRun) {
            return;
        }
    }

    setStatus("実行中...");
    const result = await sendMessage({ type: "RUN_BOOKMARKLET", id });
    if (!result?.ok) {
        setStatus(result?.message || "実行に失敗しました。", true);
        return;
    }

    setStatus("実行しました。");
    await refresh();
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
        name: nameInput.value,
        tags: parseTags(tagsInput.value),
        favorite: favoriteInput.checked,
        code: codeInput.value
    };

    if (!payload.name || !payload.code) {
        setStatus("名前とコードは必須です。", true);
        return;
    }

    try {
        const currentId = bookmarkletIdInput.value;
        if (currentId) {
            await updateBookmarklet(currentId, payload);
            setStatus("更新しました。");
        } else {
            await createBookmarklet(payload);
            setStatus("作成しました。");
        }

        clearForm();
        await refresh();
    } catch (error) {
        setStatus(error?.message || "保存に失敗しました。", true);
    }
});

clearButton.addEventListener("click", clearForm);

filterInput.addEventListener("input", renderList);

shortcutModeSelect.addEventListener("change", async () => {
    state.settings = await updateSettings({ shortcutMode: shortcutModeSelect.value });
    setStatus("ショートカットモードを保存しました。");
});

confirmBeforeRunInput.addEventListener("change", async () => {
    state.settings = await updateSettings({ confirmBeforeRun: confirmBeforeRunInput.checked });
    setStatus("設定を保存しました。");
});

Object.entries(slotSelectMap).forEach(([slot, selectElement]) => {
    selectElement.addEventListener("change", async () => {
        state.settings = await updateSettings({
            slotBindings: {
                [slot]: selectElement.value
            }
        });
        setStatus(`Slot ${slot} を更新しました。`);
    });
});

listContainer.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) {
        return;
    }

    const action = button.dataset.action;
    const id = button.dataset.id;
    const item = state.items.find((candidate) => candidate.id === id);
    if (!item) {
        return;
    }

    try {
        if (action === "run") {
            await runItem(id);
            return;
        }

        if (action === "edit") {
            fillForm(item);
            setStatus("編集モードに切り替えました。");
            return;
        }

        if (action === "duplicate") {
            await duplicateBookmarklet(id);
            setStatus("複製しました。");
            await refresh();
            return;
        }

        if (action === "favorite") {
            await updateBookmarklet(id, { favorite: !item.favorite });
            setStatus("お気に入り設定を更新しました。");
            await refresh();
            return;
        }

        if (action === "delete") {
            const shouldDelete = window.confirm(`${item.name} を削除しますか？`);
            if (!shouldDelete) {
                return;
            }
            await deleteBookmarklet(id);
            setStatus("削除しました。");
            await refresh();
            return;
        }
    } catch (error) {
        setStatus(error?.message || "操作に失敗しました。", true);
    }
});

exportButton.addEventListener("click", async () => {
    try {
        const data = await exportBookmarkletsData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `bookmarklets-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setStatus("エクスポートしました。");
    } catch (error) {
        setStatus(error?.message || "エクスポートに失敗しました。", true);
    }
});

importFileInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
        return;
    }

    try {
        const text = await file.text();
        const payload = JSON.parse(text);
        const importedCount = await importBookmarkletsData(payload, importModeSelect.value);
        setStatus(`${importedCount} 件をインポートしました。`);
        importFileInput.value = "";
        await refresh();
    } catch (error) {
        setStatus(error?.message || "インポートに失敗しました。", true);
    }
});

refresh().catch((error) => {
    setStatus(error?.message || "初期化に失敗しました。", true);
});