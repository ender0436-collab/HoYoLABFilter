const DEFAULT_SETTINGS = {
    ngWords: [],
    ngUsers: [],
    ngTags: []
};

let cfg = {
    ...DEFAULT_SETTINGS
};

let scanTimer = null;

/* ------------------------
   初期化
------------------------ */

initialize();

async function initialize() {
    await loadSettings();
    scan();
    observePage();
}

/* ------------------------
   設定読み込み
------------------------ */

async function loadSettings() {
    const stored =
        await chrome.storage.sync.get(
            DEFAULT_SETTINGS
        );

    cfg = {
        ngWords: Array.isArray(stored.ngWords)
            ? stored.ngWords
            : [],

        ngUsers: Array.isArray(stored.ngUsers)
            ? stored.ngUsers.map(String)
            : [],

        ngTags: Array.isArray(stored.ngTags)
            ? stored.ngTags
            : []
    };
}

/* ------------------------
   設定変更の即時反映
------------------------ */

chrome.storage.onChanged.addListener(
    async (changes, areaName) => {
        if (areaName !== "sync") {
            return;
        }

        const relevantKeys = [
            "ngWords",
            "ngUsers",
            "ngTags"
        ];

        const relevantChange =
            relevantKeys.some(
                key =>
                    Object.prototype.hasOwnProperty.call(
                        changes,
                        key
                    )
            );

        if (!relevantChange) {
            return;
        }

        await loadSettings();
        scan();
    }
);

/* ------------------------
   共通処理
------------------------ */

function extractUserId(link) {
    if (!link) {
        return null;
    }

    const href =
        link.getAttribute("href") || "";

    return href.match(
        /[?&]id=(\d+)/
    )?.[1] || null;
}

function containsNgWord(text) {
    const normalizedText =
        String(text || "")
            .toLocaleLowerCase();

    return cfg.ngWords.some(word => {
        const normalizedWord =
            String(word || "")
                .trim()
                .toLocaleLowerCase();

        return (
            normalizedWord.length > 0 &&
            normalizedText.includes(
                normalizedWord
            )
        );
    });
}

function isBlockedUser(userId) {
    if (!userId) {
        return false;
    }

    return cfg.ngUsers.includes(
        String(userId)
    );
}

function setFilteredDisplay(
    element,
    shouldHide
) {
    if (!element) {
        return;
    }

    /*
     * 拡張機能が非表示にした要素だけを管理します。
     * HoYoLAB自身のdisplay指定を不用意に消さないため、
     * 非表示解除時は当拡張の印がある場合だけ解除します。
     */

    if (shouldHide) {
        element.style.setProperty(
            "display",
            "none",
            "important"
        );

        element.dataset.hylFilterHidden =
            "true";

        return;
    }

    if (
        element.dataset.hylFilterHidden ===
        "true"
    ) {
        element.style.removeProperty(
            "display"
        );

        delete element.dataset
            .hylFilterHidden;
    }
}

/* ------------------------
   投稿一覧
------------------------ */

function getPostUserId(post) {
    const link =
        post.querySelector(
            '.mhy-article-card__header ' +
            'a[href^="/accountCenter?id="]'
        ) ||
        post.querySelector(
            'a[href^="/accountCenter?id="]'
        );

    return extractUserId(link);
}

function getPostTags(post) {
    return [
        ...post.querySelectorAll(
            ".mhy-topic-label-text"
        )
    ]
        .map(element =>
            element.textContent.trim()
        )
        .filter(Boolean);
}

function shouldHidePost(post) {
    const text =
        post.innerText || "";

    if (containsNgWord(text)) {
        return true;
    }

    const userId =
        getPostUserId(post);

    if (isBlockedUser(userId)) {
        return true;
    }

    const postTags =
        getPostTags(post);

    return postTags.some(tag =>
        cfg.ngTags.includes(tag)
    );
}

function filterPosts() {
    document
        .querySelectorAll(
            ".mhy-article-card-wrapper"
        )
        .forEach(post => {
            setFilteredDisplay(
                post,
                shouldHidePost(post)
            );
        });
}

/* ------------------------
   通常コメントと
   ダイアログ内リプライ
------------------------ */

/*
 * 展開ダイアログ内のリプライも .reply-card です。
 *
 * 通常コメント:
 * .reply-card
 *
 * ダイアログ先頭の元コメント:
 * .reply-detail-container__main.reply-card
 *
 * ダイアログ内の各リプライ:
 * .s-reply-list__item > .reply-card
 *
 * いずれも投稿者リンク、投稿者名、本文の構造が
 * ほぼ共通なので同じ処理を利用します。
 */

function getReplyCardUserId(card) {
    const container =
        card.querySelector(
            ":scope > .reply-card__container"
        );

    const link =
        container?.querySelector(
            ":scope > .reply-card__header " +
            "> .reply-card__link" +
            '[href*="id="]'
        ) ||
        card.querySelector(
            '.reply-card__header ' +
            '> .reply-card__link' +
            '[href*="id="]'
        );

    return extractUserId(link);
}

function getReplyCardText(card) {
    const container =
        card.querySelector(
            ":scope > .reply-card__container"
        );

    const content =
        container?.querySelector(
            ":scope > .reply-card__content pre"
        ) ||
        card.querySelector(
            ":scope > .reply-card__content pre"
        );

    return content?.innerText || "";
}

function shouldHideReplyCard(card) {
    const userId =
        getReplyCardUserId(card);

    if (isBlockedUser(userId)) {
        return true;
    }

    return containsNgWord(
        getReplyCardText(card)
    );
}

function filterReplyCards() {
    document
        .querySelectorAll(
            ".reply-card"
        )
        .forEach(card => {
            setFilteredDisplay(
                card,
                shouldHideReplyCard(card)
            );
        });
}

/* ------------------------
   折りたたみ内リプライ
------------------------ */

function getInlineReplyUserId(reply) {
    const link =
        reply.querySelector(
            ':scope ' +
            '> .reply-card-inner-reply__body ' +
            '> .reply-card-inner-reply__user' +
            '[href*="id="]'
        ) ||
        reply.querySelector(
            '.reply-card-inner-reply__user' +
            '[href*="id="]'
        );

    return extractUserId(link);
}

function getInlineReplyText(reply) {
    const content =
        reply.querySelector(
            ":scope " +
            ".reply-card-inner-reply__content"
        );

    return content?.innerText || "";
}

function shouldHideInlineReply(reply) {
    const userId =
        getInlineReplyUserId(reply);

    if (isBlockedUser(userId)) {
        return true;
    }

    return containsNgWord(
        getInlineReplyText(reply)
    );
}

function filterInlineReplies() {
    document
        .querySelectorAll(
            ".reply-card-inner-reply"
        )
        .forEach(reply => {
            setFilteredDisplay(
                reply,
                shouldHideInlineReply(reply)
            );
        });
}

/* ------------------------
   NGユーザー追加
------------------------ */

async function addUser(userId) {
    const normalizedUserId =
        String(userId || "").trim();

    if (!normalizedUserId) {
        return;
    }

    const data =
        await chrome.storage.sync.get({
            ngUsers: []
        });

    const users =
        Array.isArray(data.ngUsers)
            ? data.ngUsers.map(String)
            : [];

    if (
        !users.includes(
            normalizedUserId
        )
    ) {
        users.push(
            normalizedUserId
        );

        await chrome.storage.sync.set({
            ngUsers: users
        });
    }

    await loadSettings();
    scan();
}

/* ------------------------
   NGタグ追加
------------------------ */

async function addTag(tagName) {
    const normalizedTag =
        String(tagName || "").trim();

    if (!normalizedTag) {
        return;
    }

    const data =
        await chrome.storage.sync.get({
            ngTags: []
        });

    const tagList =
        Array.isArray(data.ngTags)
            ? data.ngTags
            : [];

    if (
        !tagList.includes(
            normalizedTag
        )
    ) {
        tagList.push(
            normalizedTag
        );

        await chrome.storage.sync.set({
            ngTags: tagList
        });
    }

    await loadSettings();
    scan();
}

/* ------------------------
   共通ブロックボタン生成
------------------------ */

function createUserBlockButton(
    userId,
    className
) {
    const button =
        document.createElement(
            "button"
        );

    button.type =
        "button";

    button.className =
        className;

    button.textContent =
        "⛔";

    button.title =
        `ユーザーID ${userId} をNG登録`;

    button.setAttribute(
        "aria-label",
        `ユーザーID ${userId} をNG登録`
    );

    button.addEventListener(
        "click",
        async event => {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            button.disabled =
                true;

            try {
                await addUser(
                    userId
                );
            } finally {
                button.disabled =
                    false;
            }
        }
    );

    return button;
}

/* ------------------------
   投稿タグ横の⛔
------------------------ */

function injectTagButtons() {
    document
        .querySelectorAll(
            ".mhy-article-card-wrapper " +
            ".mhy-topic-label"
        )
        .forEach(tagWrapper => {
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

            const tagName =
                tagText
                    ?.textContent
                    ?.trim();

            if (!tagName) {
                return;
            }

            const button =
                document.createElement(
                    "button"
                );

            button.type =
                "button";

            button.className =
                "hyl-ng-tag-btn";

            button.textContent =
                "⛔";

            button.title =
                `「${tagName}」をNGタグに登録`;

            button.setAttribute(
                "aria-label",
                `「${tagName}」をNGタグに登録`
            );

            button.addEventListener(
                "click",
                async event => {
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();

                    button.disabled =
                        true;

                    try {
                        await addTag(
                            tagName
                        );
                    } finally {
                        button.disabled =
                            false;
                    }
                }
            );

            tagWrapper.appendChild(
                button
            );
        });
}

/* ------------------------
   投稿者名横の⛔
------------------------ */

function injectPostUserButtons() {
    document
        .querySelectorAll(
            ".mhy-article-card-wrapper"
        )
        .forEach(post => {
            const nameArea =
                post.querySelector(
                    ".mhy-user-card__name"
                );

            if (!nameArea) {
                return;
            }

            if (
                nameArea.querySelector(
                    ".hyl-ng-user-btn"
                )
            ) {
                return;
            }

            const userId =
                getPostUserId(post);

            if (!userId) {
                return;
            }

            const button =
                createUserBlockButton(
                    userId,
                    "hyl-ng-user-btn"
                );

            nameArea.appendChild(
                button
            );
        });
}

/* ------------------------
   通常コメント・ダイアログ内
   リプライの投稿者名横⛔
------------------------ */

function injectReplyCardButtons() {
    document
        .querySelectorAll(
            ".reply-card"
        )
        .forEach(card => {
            const container =
                card.querySelector(
                    ":scope > .reply-card__container"
                );

            const accountArea =
                container?.querySelector(
                    ":scope > .reply-card__header " +
                    "> .reply-card__account"
                ) ||
                card.querySelector(
                    ":scope > .reply-card__header " +
                    "> .reply-card__account"
                );

            const nameLink =
                accountArea?.querySelector(
                    ":scope > .reply-card__nickname"
                );

            if (
                !accountArea ||
                !nameLink
            ) {
                return;
            }

            if (
                accountArea.querySelector(
                    ":scope > .hyl-comment-user-btn"
                )
            ) {
                return;
            }

            const userId =
                getReplyCardUserId(card);

            if (!userId) {
                return;
            }

            const button =
                createUserBlockButton(
                    userId,
                    "hyl-comment-user-btn"
                );

            /*
             * a要素の中へbuttonを入れず、
             * 投稿者名リンクの直後へ配置します。
             */

            nameLink.insertAdjacentElement(
                "afterend",
                button
            );
        });
}

/* ------------------------
   折りたたみ内リプライの
   投稿者名横⛔
------------------------ */

function injectInlineReplyButtons() {
    document
        .querySelectorAll(
            ".reply-card-inner-reply"
        )
        .forEach(reply => {
            const body =
                reply.querySelector(
                    ":scope " +
                    "> .reply-card-inner-reply__body"
                );

            const nameLink =
                body?.querySelector(
                    ".reply-card-inner-reply__name"
                );

            if (!body || !nameLink) {
                return;
            }

            if (
                body.querySelector(
                    ".hyl-reply-user-btn"
                )
            ) {
                return;
            }

            const userId =
                getInlineReplyUserId(
                    reply
                );

            if (!userId) {
                return;
            }

            const button =
                createUserBlockButton(
                    userId,
                    "hyl-reply-user-btn"
                );

            /*
             * 投稿者名リンクの直後へ追加します。
             * 「リプライ先のユーザー名」には追加しません。
             */

            nameLink.insertAdjacentElement(
                "afterend",
                button
            );
        });
}

/* ------------------------
   ボタン注入
------------------------ */

function injectButtons() {
    injectPostUserButtons();
    injectTagButtons();
    injectReplyCardButtons();
    injectInlineReplyButtons();
}

/* ------------------------
   全フィルター実行
------------------------ */

function scan() {
    filterPosts();

    /*
     * コメントの判定では直接の本文だけを見るため、
     * 配下にブロック対象リプライがあっても
     * 親コメント全体は非表示になりません。
     */

    filterReplyCards();

    /*
     * 複数リプライがある場合も、
     * 各 .reply-card-inner-reply を個別に判定します。
     */

    filterInlineReplies();

    injectButtons();
}

/* ------------------------
   DOM変更監視
------------------------ */

function scheduleScan() {
    clearTimeout(
        scanTimer
    );

    scanTimer =
        setTimeout(
            scan,
            120
        );
}

function observePage() {
    if (!document.body) {
        return;
    }

    const observer =
        new MutationObserver(
            mutations => {
                const hasRelevantMutation =
                    mutations.some(
                        mutation =>
                            mutation.type ===
                                "childList" &&
                            mutation.addedNodes
                                .length > 0
                    );

                if (
                    hasRelevantMutation
                ) {
                    scheduleScan();
                }
            }
        );

    observer.observe(
        document.body,
        {
            childList: true,
            subtree: true
        }
    );
}
