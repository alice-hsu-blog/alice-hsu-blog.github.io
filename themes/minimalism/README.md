# minimalism

Alice Hsu's Blog 的主題。純 CSS（`assets/css/main.css`）加一小段 JS（`assets/js/main.js`），不需要 Node 或 Tailwind。

## 設定

選單和頁尾連結都在網站設定檔裡：

- `menus.main`：頁首置中的導覽（文章、分類、禱告、關於）。
- `menus.site`：頁尾「個人網頁」一欄。
- `menus.elsewhere`：頁尾「其他網站」一欄。
- `menus.footer`：頁尾最下面一行（RSS 等）。

選單的 `name` 可以直接寫文字，也可以寫 `i18n/` 裡的鍵（例如 `nav.posts`），會自動翻成目前語言。

會讀取的 `params`：`favicon`、`description`、`keywords`、`defaultAuthor`、`Image`、`Twitter_Site`、
`readingProgress.enabled`、`post.showRelated`、`post.relatedPostsCount`。

## 文章 front matter

- `cover` + `cover_on_post = true`：在標題和日期之後顯示封面圖。
- `categories`：只顯示第一個分類。
- `layout: "about"` / `"portfolio"`：一般頁面版型，只多一個 CSS class（`page-about`、`page-portfolio`）。

## Shortcodes

- `masonry`：把裡面的圖片排成 `columns` 欄，圖片的替代文字會顯示成圖說。
- `icon`：有 `url` 和 `label` 時輸出文字連結。
- `hl`：一條水平線，`width` 是寬度（vw）。

`video-js`、`embed-pdf`、`quiz` 由網站的模組、另一個主題和 `layouts/` 提供，這個主題只負責配色變數（`--color-*`）。

## 首頁線條畫

`layouts/_partials/pen-drawing.html` 是 47 條筆畫，每條的 `--t`（開始時間）和 `--d`（長度）寫在 `style` 裡。
點圖會重播。訪客若設定「減少動態效果」，會直接顯示完成的圖。

## 來源

`layouts/index.json`、`rss.xml`、`index.webappmanifest`、`_partials/opengraph.html`、`_partials/twitter_cards.html`
取自 [Hugo Narrow](https://github.com/tom2almighty/hugo-narrow)（MIT，© 2025 tom2almighty）。
