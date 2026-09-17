const DEFAULT_SETTINGS = {
    ngWords: [],
    ngUsers: [],
    ngTags: [],
    darkMode: false
};

let settings = {};

/* -------------------------
   初期化
------------------------- */

document.addEventListener(
    "DOMContentLoaded",
    initialize
);

async function initialize() {

    settings =
        await chrome.storage.sync.get(
            DEFAULT_SETTINGS
        );

    initializeTabs();

    initializeTheme();

    initializeLists();

    initializeImportExport();

    const savedTab =
        localStorage.getItem(
            "activeTab"
        ) || "words";

    switchTab(savedTab);

    render();
}

/* -------------------------
   コントロール反映
------------------------- */

function refreshControls() {

    const darkModeToggle =
        document.getElementById(
            "darkMode"
        );

    if (darkModeToggle) {

        darkModeToggle.checked =
            settings.darkMode;
    }
}

/* -------------------------
   ストレージ同期
------------------------- */

chrome.storage.onChanged.addListener(
    async () => {

        settings =
            await chrome.storage.sync.get(
                DEFAULT_SETTINGS
            );

        refreshControls();

        applyTheme();

        render();
    }
);

/* -------------------------
   タブ
------------------------- */

function initializeTabs() {

    document
        .querySelectorAll(".tab")
        .forEach(tab => {

            tab.addEventListener(
                "click",
                () => {

                    const target =
                        tab.dataset.tab;

                    switchTab(
                        target
                    );
                }
            );
        });
}

function switchTab(name) {

    localStorage.setItem(
        "activeTab",
        name
    );

    document
        .querySelectorAll(".tab")
        .forEach(tab => {

            tab.classList.toggle(
                "active",
                tab.dataset.tab ===
                name
            );
        });

    document
        .querySelectorAll(
            ".tab-content"
        )
        .forEach(content => {

            content.classList.remove(
                "active"
            );
        });

    const activeContent =
        document.getElementById(
            `tab-${name}`
        );

    if (activeContent) {

        activeContent.classList.add(
            "active"
        );
    }
}

/* -------------------------
   テーマ
------------------------- */

function initializeTheme() {

    const checkbox =
        document.getElementById(
            "darkMode"
        );

    refreshControls();

    applyTheme();

    checkbox.addEventListener(
        "change",
        async () => {

            settings.darkMode =
                checkbox.checked;

            refreshControls();

            applyTheme();

            await saveSettings();
        }
    );
}

function applyTheme() {

    document.body.classList.toggle(
        "dark",
        settings.darkMode
    );
}

/* -------------------------
   リスト初期化
------------------------- */

function initializeLists() {

    setupAddControl(
        "newWord",
        "addWord",
        "ngWords"
    );

    setupAddControl(
        "newUser",
        "addUser",
        "ngUsers"
    );

    setupAddControl(
        "newTag",
        "addTag",
        "ngTags"
    );
}

/* -------------------------
   共通追加
------------------------- */

function setupAddControl(
    inputId,
    buttonId,
    key
) {

    const input =
        document.getElementById(
            inputId
        );

    const button =
        document.getElementById(
            buttonId
        );

    button.addEventListener(
        "click",
        () =>
            addItem(
                inputId,
                key
            )
    );

    input.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Enter"
            ) {

                event.preventDefault();

                addItem(
                    inputId,
                    key
                );
            }
        }
    );
}

/* -------------------------
   値正規化
------------------------- */

function normalizeValue(
    value,
    key
) {

    value =
        value.trim();

    if (
        key ===
        "ngUsers"
    ) {

        const match =
            value.match(
                /id=(\d+)/
            );

        if (match) {

            value =
                match[1];
        }
    }

    return value;
}

/* -------------------------
   追加
------------------------- */

async function addItem(
    inputId,
    key
) {

    const input =
        document.getElementById(
            inputId
        );

    let value =
        normalizeValue(
            input.value,
            key
        );

    if (!value) {
        return;
    }

    const exists =
        settings[key].some(
            item =>
                item.toLowerCase() ===
                value.toLowerCase()
        );

    if (exists) {

        input.select();

        return;
    }

    settings[key].push(
        value
    );

    await saveSettings();

    input.value = "";

    render();

    input.focus();
}

/* -------------------------
   削除
------------------------- */

async function removeItem(
    key,
    value
) {

    settings[key] =
        settings[key].filter(
            item =>
                item !== value
        );

    await saveSettings();

    render();
}

/* -------------------------
   描画
------------------------- */

function render() {

    renderList(
        "wordList",
        settings.ngWords,
        "ngWords"
    );

    renderList(
        "userList",
        settings.ngUsers,
        "ngUsers"
    );

    renderList(
        "tagList",
        settings.ngTags,
        "ngTags"
    );

    updateStats();
}

function renderList(
    elementId,
    values,
    key
) {

    const container =
        document.getElementById(
            elementId
        );

    container.innerHTML = "";

    values.forEach(
        value => {

            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "item";

            const text =
                document.createElement(
                    "span"
                );

            text.className =
                "item-text";

            text.textContent =
                value;

            const button =
                document.createElement(
                    "button"
                );

            button.className =
                "delete-btn";

            button.textContent =
                "×";

            button.addEventListener(
                "click",
                () => {

                    removeItem(
                        key,
                        value
                    );
                }
            );

            item.appendChild(
                text
            );

            item.appendChild(
                button
            );

            container.appendChild(
                item
            );
        }
    );
}

/* -------------------------
   件数
------------------------- */

function updateStats() {

    const wordCount =
        settings.ngWords.length;

    const userCount =
        settings.ngUsers.length;

    const tagCount =
        settings.ngTags.length;

    const total =
        wordCount +
        userCount +
        tagCount;

    document.getElementById(
        "wordCount"
    ).textContent =
        `${wordCount}件`;

    document.getElementById(
        "userCount"
    ).textContent =
        `${userCount}件`;

    document.getElementById(
        "tagCount"
    ).textContent =
        `${tagCount}件`;

    document.getElementById(
        "statWords"
    ).textContent =
        wordCount;

    document.getElementById(
        "statUsers"
    ).textContent =
        userCount;

    document.getElementById(
        "statTags"
    ).textContent =
        tagCount;

    document.getElementById(
        "statTotal"
    ).textContent =
        total;
}

/* -------------------------
   保存
------------------------- */

async function saveSettings() {

    await chrome.storage.sync.set(
        settings
    );
}

/* -------------------------
   インポート / エクスポート
------------------------- */

function initializeImportExport() {

    document
        .getElementById(
            "exportSettings"
        )
        .addEventListener(
            "click",
            exportSettings
        );

    document
        .getElementById(
            "importSettings"
        )
        .addEventListener(
            "click",
            () => {

                document
                    .getElementById(
                        "importFile"
                    )
                    .click();
            }
        );

    document
        .getElementById(
            "importFile"
        )
        .addEventListener(
            "change",
            importSettings
        );
}

async function exportSettings() {

    const blob =
        new Blob(
            [
                JSON.stringify(
                    settings,
                    null,
                    2
                )
            ],
            {
                type:
                    "application/json"
            }
        );

    const url =
        URL.createObjectURL(
            blob
        );

    const a =
        document.createElement(
            "a"
        );

    a.href =
        url;

    a.download =
        "HoYoLABFilterSettings.json";

    document.body.appendChild(
        a
    );

    a.click();

    a.remove();

    URL.revokeObjectURL(
        url
    );
}

async function importSettings(
    event
) {

    const file =
        event.target.files[0];

    if (!file) {
        return;
    }

    try {

        const text =
            await file.text();

        const imported =
            JSON.parse(
                text
            );
        
        const confirmed =
    confirm(
`設定をインポートします。

現在登録されている内容はすべて上書きされます。

・NGワード
・NGユーザー
・NGタグ
・ダークモード設定

よろしいですか？`
    );

if (!confirmed) {

    event.target.value = "";

    return;
}

        settings = {

            ngWords:
                Array.isArray(
                    imported.ngWords
                )
                ? imported.ngWords
                : [],

            ngUsers:
                Array.isArray(
                    imported.ngUsers
                )
                ? imported.ngUsers
                : [],

            ngTags:
                Array.isArray(
                    imported.ngTags
                )
                ? imported.ngTags
                : [],

            darkMode:
                !!imported.darkMode
        };

await saveSettings();

refreshControls();

applyTheme();

render();

alert(
    "インポートが完了しました"
);

    } catch {

        alert(
            "設定ファイルを読み込めませんでした"
        );
    }

    event.target.value = "";
}
