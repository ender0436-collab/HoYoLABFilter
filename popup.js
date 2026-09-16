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

    applyTheme();

    setupAddButton(
        "wordInput",
        "addWord",
        "ngWords"
    );

    setupAddButton(
        "userInput",
        "addUser",
        "ngUsers"
    );

    setupAddButton(
        "tagInput",
        "addTag",
        "ngTags"
    );

    document
        .getElementById(
            "openOptions"
        )
        .addEventListener(
            "click",
            openOptions
        );
}

/* -------------------------
   テーマ
------------------------- */

function applyTheme() {

    if (
        settings.darkMode
    ) {

        document.body.classList.add(
            "dark"
        );
    }
    else {

        document.body.classList.remove(
            "dark"
        );
    }
}

/* -------------------------
   設定保存
------------------------- */

async function saveSettings() {

    await chrome.storage.sync.set(
        settings
    );
}

/* -------------------------
   共通追加処理
------------------------- */

function setupAddButton(
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
   項目追加
------------------------- */

async function addItem(
    inputId,
    key
) {

    const input =
        document.getElementById(
            inputId
        );

    const value =
        input.value.trim();

    if (!value) {

        return;
    }

    if (
        !settings[key].includes(
            value
        )
    ) {

        settings[key].push(
            value
        );

        await saveSettings();

        showSuccess(
            "追加しました"
        );
    }
    else {

        showInfo(
            "既に登録されています"
        );
    }

    input.value = "";

    input.focus();
}

/* -------------------------
   設定画面
------------------------- */

function openOptions() {

    chrome.runtime
        .openOptionsPage();
}

/* -------------------------
   通知
------------------------- */

function showMessage(
    text,
    type
) {

    let toast =
        document.getElementById(
            "toast"
        );

    if (!toast) {

        toast =
            document.createElement(
                "div"
            );

        toast.id =
            "toast";

        document.body.appendChild(
            toast
        );
    }

    toast.textContent =
        text;

    toast.className =
        `toast ${type}`;

    toast.style.opacity =
        "1";

    clearTimeout(
        toast._timer
    );

    toast._timer =
        setTimeout(() => {

            toast.style.opacity =
                "0";

        }, 2000);
}

function showSuccess(
    message
) {

    showMessage(
        message,
        "success"
    );
}

function showInfo(
    message
) {

    showMessage(
        message,
        "info"
    );
}