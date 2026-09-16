let cfg = {};

/* ------------------------
   設定読込
------------------------ */

async function load() {

    cfg =
        await chrome.storage.sync.get({
            ngWords: [],
            ngUsers: [],
            ngTags: []
        });

    scan();
}

chrome.storage.onChanged.addListener(
    load
);

/* ------------------------
   ユーザーID取得
------------------------ */

function uid(post) {

    const link =
        post.querySelector(
            'a[href^="/accountCenter?id="]'
        );

    return link
        ?.getAttribute("href")
        ?.match(/id=(\d+)/)
        ?.[1];
}

/* ------------------------
   タグ取得
------------------------ */

function tags(post) {

    return [
        ...post.querySelectorAll(
            ".mhy-topic-label-text"
        )
    ].map(
        tag =>
            tag.textContent.trim()
    );
}

/* ------------------------
   表示判定
------------------------ */

function hide(post) {

    const text =
        post.innerText.toLowerCase();

    if (
        cfg.ngWords.some(
            word =>
                text.includes(
                    word.toLowerCase()
                )
        )
    ) {
        return true;
    }

    const userId =
        uid(post);

    if (
        userId &&
        cfg.ngUsers.includes(
            userId
        )
    ) {
        return true;
    }

    if (
        tags(post).some(
            tag =>
                cfg.ngTags.includes(
                    tag
                )
        )
    ) {
        return true;
    }

    return false;
}

/* ------------------------
   NGタグ追加
------------------------ */

async function addTag(tag) {

    const data =
        await chrome.storage.sync.get({
            ngTags: []
        });

    if (
        !data.ngTags.includes(tag)
    ) {

        data.ngTags.push(tag);

        await chrome.storage.sync.set({
            ngTags:
                data.ngTags
        });
    }

    await load();
}

/* ------------------------
   NGユーザー追加
------------------------ */

async function addUser(userId) {

    const data =
        await chrome.storage.sync.get({
            ngUsers: []
        });

    if (
        !data.ngUsers.includes(
            userId
        )
    ) {

        data.ngUsers.push(
            userId
        );

        await chrome.storage.sync.set({
            ngUsers:
                data.ngUsers
        });
    }

    await load();
}

/* ------------------------
   ボタン追加
------------------------ */

function inject() {

    injectTagButtons();

    injectUserButtons();
}

/* ------------------------
   タグ横 NGボタン
------------------------ */

function injectTagButtons() {

    document
        .querySelectorAll(
            ".mhy-topic-label"
        )
        .forEach(
            tagWrapper => {

                if (
                    tagWrapper.querySelector(
                        ".hyl-ng-tag-btn"
                    )
                ) {
                    return;
                }

                const tagText =
                    tagWrapper.querySelector(
                        ".mhy-topic-label-text"
                    );

                if (!tagText) {
                    return;
                }

                const button =
                    document.createElement(
                        "button"
                    );

                button.textContent =
                    "⛔";

                button.className =
                    "hyl-ng-tag-btn";

                button.title =
                    "NGタグ登録";

                button.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();

                        event.stopPropagation();

                        addTag(
                            tagText
                                .textContent
                                .trim()
                        );
                    }
                );

                tagWrapper.appendChild(
                    button
                );
            }
        );
}

/* ------------------------
   投稿者名横 NGボタン
------------------------ */

function injectUserButtons() {

    document
        .querySelectorAll(
            ".mhy-article-card-wrapper"
        )
        .forEach(
            post => {

                const userNameArea =
                    post.querySelector(
                        ".mhy-user-card__name"
                    );

                if (
                    !userNameArea
                ) {
                    return;
                }

                if (
                    userNameArea.querySelector(
                        ".hyl-ng-user-btn"
                    )
                ) {
                    return;
                }

                const userId =
                    uid(post);

                if (!userId) {
                    return;
                }

                const button =
                    document.createElement(
                        "button"
                    );

                button.textContent =
                    "⛔";

                button.className =
                    "hyl-ng-user-btn";

                button.title =
                    "NGユーザー登録";

                button.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();

                        event.stopPropagation();

                        addUser(
                            userId
                        );
                    }
                );

                userNameArea.appendChild(
                    button
                );
            }
        );
}

/* ------------------------
   フィルタ実行
------------------------ */

function scan() {

    document
        .querySelectorAll(
            ".mhy-article-card-wrapper"
        )
        .forEach(
            post => {

                post.style.display =
                    hide(post)
                        ? "none"
                        : "";
            }
        );

    inject();
}

/* ------------------------
   DOM監視
------------------------ */

load();

new MutationObserver(
    () => {

        scan();
    }
).observe(
    document.body,
    {
        childList: true,
        subtree: true
    }
);