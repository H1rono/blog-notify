# blog-notify

[![clasp](https://img.shields.io/badge/built%20with-clasp-4285f4.svg)](https://github.com/google/clasp)

crowi → traQ Webhook with GAS

## 機能

1. [traP Wiki](https://github.com/traPtitech/crowi)のブログリレーページを読む
2. ページの内容を解析して通知メッセージを作成
3. traQ webhookで通知を投稿

## Development

[npm](https://www.npmjs.com/)と[clasp](https://github.com/google/clasp)に依存

```bash
$ git clone https://github.com/H1rono/blog-notify.git
$ cd blog-notify
$ npm i
$ clasp clone --rootDir "$(pwd)" scriptId ${YOUR_GAS_SCRIPT_ID}
$ rm main.js    # ローカルではTypeScriptを使用するため削除
```

## GASのプロパティ設定

key | value
:-- | :--
`CROWI_ACCESS_TOKEN` | WikiのAPIアクセストークン
`CROWI_HOST` | Wikiのサーバーのhostname
`TRAQ_CHANNEL_ID` | 通知を投稿するチャンネルのID
`TRAQ_LOG_CHANNEL_ID` | 実行ログを流すチャンネルのID
`CROWI_PAGE_PATH` | ブログリレーページのパス
`START_DATE` | ブログリレー開始日
`WEBHOOK_SECRET` | Webhookシークレット
`WEBHOOK_ID` | Webhook ID
