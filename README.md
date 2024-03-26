# blog-notify

[![clasp](https://img.shields.io/badge/built%20with-clasp-4285f4.svg)](https://github.com/google/clasp)
[![Node.js CI](https://github.com/H1rono/blog-notify/actions/workflows/node.yml/badge.svg)](https://github.com/H1rono/blog-notify/actions/workflows/node.yml)

crowi → traQ Webhook with GAS

## 機能

1. [traP Wiki](https://github.com/traPtitech/crowi)のブログリレーページを読む
2. ページの内容を解析して通知メッセージを作成
3. traQ webhookで通知を投稿

## Development

[npm](https://www.npmjs.com/)と[clasp](https://github.com/google/clasp)に依存

```bash
$ export YOUR_GAS_SCRIPT_ID= # GASプロジェクトのID
$ git clone https://github.com/H1rono/blog-notify.git
$ cd blog-notify
$ npm i
$ npm run login  # 最初の一度のみ
$ npm run clone -- "${YOUR_GAS_SCRIPT_ID}"
$ rm main.js     # ローカルではTypeScriptを使用するため削除
```

## GASのプロパティ設定

key | value
:-- | :--
`CROWI_HOST` | Wikiのサーバーのhostname
`CROWI_PAGE_PATH` | ブログリレーページのパス
`CROWI_ACCESS_TOKEN` | WikiのAPIアクセストークン
`TRAQ_HOST` | traQのサーバーのhostname
`TRAQ_CHANNEL_ID` | 通知を投稿するチャンネルのID
`TRAQ_LOG_CHANNEL_ID` | 実行ログを流すチャンネルのID
`TRAQ_BURI_CHANNEL_PATH` | ブログリレー運営チャンネルのパス(`#`始まり)
`TRAQ_REVIEW_CHANNEL_PATH` | ブログの添削・相談用チャンネルのパス(`#`始まり)
`WEBHOOK_SECRET` | Webhookシークレット
`WEBHOOK_ID` | Webhook ID
`TAG` | ブログリレーで使用するタグ
`TITLE` | ブログリレーのタイトル
`START_DATE` | ブログリレー開始日
`TRIGGER_SET_HOURS` | リマインドする時間(時)
`TRIGGER_SET_MINUTES` | リマインドする時間(分)

## このリポジトリに関するブログ記事

- [ブログリレーを支えるリマインダー | 東京工業大学デジタル創作同好会traP](https://trap.jp/post/1992/)
