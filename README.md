# blog-notify

[![clasp](https://img.shields.io/badge/built%20with-clasp-4285f4.svg)](https://github.com/google/clasp)

crowi → bot-h1rono with GAS

## 機能

1. [traP Wiki](https://github.com/traPtitech/crowi)のブログリレーページを読む
2. ページの内容を解析して通知メッセージを作成
3. [bot-h1rono](https://github.com/H1rono/bot-h1rono)で通知を投稿

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
`BOT_VERIFICATION_TOKEN` | bot-h1ronoのtraQ BOT Verification Token
`BOT_HOST` | bot-h1ronoを実行しているサーバーのhostname
`CROWI_ACCESS_TOKEN` | WikiのAPIアクセストークン
`CROWI_HOST` | Wikiのサーバーのhostname
`TRAQ_CHANNEL_ID` | 通知を投稿するチャンネルのID
