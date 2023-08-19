const WRITER_REGEXP = /@[a-zA-Z0-9_-]+/g

type InitResult = {
    props: GoogleAppsScript.Properties.Properties
    noticeMessage: string
}

function init(): InitResult {
    const props = PropertiesService.getScriptProperties()
    const crowi_host = props.getProperty("CROWI_HOST")
    const crowi_path = props.getProperty("CROWI_PAGE_PATH")
    const url = `https://${crowi_host}${crowi_path}`
    const noticeMessage = `
## 注意事項
- \`新歓ブログリレー2023\`のタグをつけてください
- 記事の初めにブログリレー何日目の記事かを明記してください
- 記事の最後に次の日の担当者を紹介してください
- **post imageを設定して**ください
- わからないことがあれば気軽に #event/welcome/blog/buri まで
- 詳細は ${url}`
    return { props, noticeMessage }
}

function main() {
    const { props, noticeMessage } = init()
    const pageBody = getCrowiPageBody(props)
    const schedules = extractSchedule(pageBody)
    const dateDiff = calcDateDiff(props)
    const messageHead = dateDiff < 0 ? getBeforeMessage(-dateDiff) : getDuringMessage(dateDiff, schedules)
    const res = postMessage(props, messageHead + noticeMessage, false)
    Logger.log(res?.getResponseCode())
    // Logger.log(messageHead + noticeMessage)
    const logMessage = extractScheduleStr(pageBody)
    const res2 = postMessage(props, logMessage, true)
    Logger.log(res2?.getResponseCode())
    // Logger.log(logMessage)
}

function getCrowiPageBody(props: GoogleAppsScript.Properties.Properties): string {
    const host = props.getProperty("CROWI_HOST")
    const token = props.getProperty("CROWI_ACCESS_TOKEN")
    const path = props.getProperty("CROWI_PAGE_PATH")
    if (host === null || token === null || path === null) {
        return ""
    }
    const encodedPath = encodeURI(path)
    const url = `https://${host}/_api/pages.get?access_token=${token}&path=${encodedPath}`
    const res = UrlFetchApp.fetch(url)
    const payload = JSON.parse(res.getContentText())
    return payload["page"]["revision"]["body"] as string
}

function hmacSha1(key: string, message: string): string {
    const algorithm = Utilities.MacAlgorithm.HMAC_SHA_1
    const charset = Utilities.Charset.UTF_8
    return Utilities.computeHmacSignature(algorithm, message, key, charset)
        .map((v) => (v < 0 ? v + 256 : v))
        .map((v) => v.toString(16).padStart(2, "0"))
        .join("")
}

function postMessage(
    props: GoogleAppsScript.Properties.Properties,
    content: string,
    log: boolean,
): GoogleAppsScript.URL_Fetch.HTTPResponse | null {
    const webhookSecret = props.getProperty("WEBHOOK_SECRET")
    const signature = webhookSecret && hmacSha1(webhookSecret, content)
    const channelId = props.getProperty("TRAQ_CHANNEL_ID")
    const logChannelId = props.getProperty("TRAQ_LOG_CHANNEL_ID")
    if (signature === null || channelId === null || logChannelId === null) {
        return null
    }
    const params: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
        method: "post",
        contentType: "text/plain; charset=utf-8",
        headers: {
            "X-TRAQ-Signature": signature,
            "X-TRAQ-Channel-Id": log ? logChannelId : channelId,
        },
        payload: content,
    }
    const webhookId = props.getProperty("WEBHOOK_ID")
    const url = `https://q.trap.jp/api/v3/webhooks/${webhookId}?embed=${!log}`
    return UrlFetchApp.fetch(url, params)
}

type Schedule = {
    date: string
    day: number
    writer: string
    summary: string
}

function scheduleToString(s: Schedule): string {
    let writers = Array.from(s.writer.matchAll(WRITER_REGEXP))
        .map((match) => match[0])
        .join(", ")
    return `| ${s.date} | ${s.day} | ${writers} | ${s.summary} |`
}

function schedulesToTable(schedules: Schedule[]): string {
    return `\
| 日付 | 日目 | 担当者 | タイトル(内容) |
| :-: | :-: | :-: | :-- |
${schedules.map(scheduleToString).join("\n")}`
}

function extractScheduleStr(pageBody: string): string {
    const lines = pageBody.split(/\r\n|\r|\n/)
    const startIndex = lines.findIndex((l: string): boolean => l.startsWith("|日付"))
    var table = ""
    for (var i = startIndex; i < lines.length; ++i) {
        const l = lines[i]
        if (l.startsWith("|")) {
            table += l + "\n"
        } else {
            break
        }
    }
    return table
}

function extractSchedule(pageBody: string): Schedule[] {
    const tableStr = extractScheduleStr(pageBody)
    const lines = tableStr.split("\n").filter((l: string): boolean => l.startsWith("|"))
    const table: Schedule[] = []
    for (var i = 2; i < lines.length; ++i) {
        // | 日付 | 日目 | 担当者 | タイトル(内容) |
        const cells = lines[i]
            .split("|")
            .slice(1, -1)
            .map((c: string): string => c.trim())
        const s: Schedule = {
            date: cells[0],
            day: parseInt(cells[1]),
            writer: cells[2],
            summary: cells[3],
        }
        if (s.writer.length === 0) {
            continue
        }
        if (s.date === "同上") {
            s.date = table[table.length - 1].date
        }
        table.push(s)
    }
    return table
}

// START_DATEとの差分を取得する
// now - date
function calcDateDiff(props: GoogleAppsScript.Properties.Properties): number {
    const d = props.getProperty("START_DATE")
    if (d === null) {
        return 0
    }
    const date = new Date()
    const dateUtcTime = date.getTime() + date.getTimezoneOffset() * 60 * 1000
    const now = new Date()
    const nowUtcTime = now.getTime() + now.getTimezoneOffset() * 60 * 1000
    const diff = nowUtcTime - dateUtcTime
    return Math.floor(diff / (1000 * 60 * 60 * 24))
}

// ブログリレー期間前のメッセージを取得する関数
// diff > 0
function getBeforeMessage(diff: number): string {
    return `# 新歓ブログリレーまであと ${diff}日`
}

// ブログリレー期間中のメッセージを取得する関数
// diff >= 0
function getDuringMessage(diff: number, schedules: Schedule[]): string {
    const d = diff + 1
    const ss = schedules.filter((s: Schedule): boolean => d <= s.day && s.day <= d + 1)
    if (ss.length > 0) {
        return `# 新歓ブログリレー ${d}日目\n${schedulesToTable(ss)}`
    }
    return `# 新歓ブログリレー ${d}日目\n担当者はいません`
}
