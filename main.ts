const WRITER_REGEXP = /@[a-zA-Z0-9_-]+/g
const FUNCTION_NAME = "main"

type CrowiInfo = {
    host: string
    pagePath: string
    token: string
}

type traQInfo = {
    host: string
    channelId: string
    logChannelId: string
    buriChannelPath: string
    reviewChannelPath: string
    webhookId: string
    webhookSecret: string
}

type BlogRelayInfo = {
    tag: string
    title: string
    startDate: string
}

type InitResult = {
    crowi: CrowiInfo
    traQ: traQInfo
    blogRelay: BlogRelayInfo
    noticeMessage: string
}

function init(): InitResult | null {
    const props = PropertiesService.getScriptProperties()
    const crowiHost = props.getProperty("CROWI_HOST")
    const crowiPath = props.getProperty("CROWI_PAGE_PATH")
    const crowiToken = props.getProperty("CROWI_ACCESS_TOKEN")
    if (crowiHost === null || crowiPath === null || crowiToken === null) {
        return null
    }
    const traQHost = props.getProperty("TRAQ_HOST")
    const traQChannelId = props.getProperty("TRAQ_CHANNEL_ID")
    const traQLogChannelId = props.getProperty("TRAQ_LOG_CHANNEL_ID")
    const traQBuriChannelPath = props.getProperty("TRAQ_BURI_CHANNEL_PATH")
    const traQReviewChannelPath = props.getProperty("TRAQ_REVIEW_CHANNEL_PATH")
    const traQWebhookId = props.getProperty("WEBHOOK_ID")
    const traQWebhookSecret = props.getProperty("WEBHOOK_SECRET")
    if (
        traQHost === null ||
        traQChannelId === null ||
        traQLogChannelId === null ||
        traQBuriChannelPath === null ||
        traQReviewChannelPath === null ||
        traQWebhookId === null ||
        traQWebhookSecret === null
    ) {
        return null
    }
    const blogRelayTag = props.getProperty("TAG")
    const blogRelayTitle = props.getProperty("TITLE")
    const blogRelayStartDate = props.getProperty("START_DATE")
    if (blogRelayTag === null || blogRelayTitle === null || blogRelayStartDate === null) {
        return null
    }
    const url = `https://${crowiHost}${crowiPath}`
    const noticeMessage = `
## 注意事項
- \`${blogRelayTag}\`のタグをつけてください
- 記事の初めにブログリレー何日目の記事かを明記してください
- 記事の最後に次の日の担当者を紹介してください
- **post imageを設定して**ください
- わからないことがあれば気軽に ${traQBuriChannelPath} まで
- 記事内容の添削や相談は、気軽に ${traQReviewChannelPath} へ
- 詳細は ${url}`
    return {
        crowi: {
            host: crowiHost,
            pagePath: crowiPath,
            token: crowiToken,
        },
        traQ: {
            host: traQHost,
            channelId: traQChannelId,
            logChannelId: traQLogChannelId,
            buriChannelPath: traQBuriChannelPath,
            reviewChannelPath: traQReviewChannelPath,
            webhookId: traQWebhookId,
            webhookSecret: traQWebhookSecret,
        },
        blogRelay: {
            tag: blogRelayTag,
            title: blogRelayTitle,
            startDate: blogRelayStartDate,
        },
        noticeMessage,
    }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function main(): void {
    const v = init()
    if (v === null) {
        Logger.log("init failed")
        return
    }
    const { crowi, traQ, blogRelay, noticeMessage } = v
    const pageBody = getCrowiPageBody(crowi)
    const schedules = extractSchedule(pageBody)
    const dateDiff = calcDateDiff(blogRelay)
    const messageHead =
        dateDiff < 0
            ? getBeforeMessage(blogRelay.title, -dateDiff)
            : getDuringMessage(blogRelay.title, dateDiff, schedules)
    const res = postMessage(traQ, messageHead + noticeMessage, false)
    Logger.log(res.getResponseCode())
    Logger.log(messageHead + noticeMessage)
    // const logMessage = extractScheduleStr(pageBody)
    const logMessage = schedulesToCalendar(blogRelay, schedules)
    const res2 = postMessage(traQ, logMessage, true)
    Logger.log(res2.getResponseCode())
    Logger.log(logMessage)
    deleteAllTrigger()
}

function getCrowiPageBody({ host, pagePath, token }: CrowiInfo): string {
    const encodedPath = encodeURI(pagePath)
    const url = `https://${host}/_api/pages.get?access_token=${token}&path=${encodedPath}`
    const res = UrlFetchApp.fetch(url)
    const payload = JSON.parse(res.getContentText())
    // eslint-disable-next-line @typescript-eslint/dot-notation
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
    { host, channelId, logChannelId, webhookId, webhookSecret }: traQInfo,
    content: string,
    log: boolean,
): GoogleAppsScript.URL_Fetch.HTTPResponse {
    const signature = hmacSha1(webhookSecret, content)
    const params: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
        method: "post",
        contentType: "text/plain; charset=utf-8",
        headers: {
            "X-TRAQ-Signature": signature,
            "X-TRAQ-Channel-Id": log ? logChannelId : channelId,
        },
        payload: content,
    }
    const url = `https://${host}/api/v3/webhooks/${webhookId}?embed=${(!log).toString()}`
    return UrlFetchApp.fetch(url, params)
}

type Schedule = {
    date: string
    day: number
    writer: string
    summary: string
}

function scheduleToString(s: Schedule): string {
    const writers = Array.from(s.writer.matchAll(WRITER_REGEXP))
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

function dateOffset(date: Date, offset: number): Date {
    const dateMs = date.getTime()
    const offsetMs = offset * 24 * 60 * 60 * 1000
    return new Date(dateMs + offsetMs)
}

function actualDateOfSchedule({ startDate }: BlogRelayInfo, schedule: Schedule): Date {
    // UNIXタイムスタンプ
    const startDateParsed = new Date(startDate)
    // 経過日数のms
    const offset = schedule.day - 1
    return dateOffset(startDateParsed, offset)
}

function scheduleToStringInCalendar(schedule: Schedule): string {
    return schedule.writer
}

function schedulesToCalendar(blogRelayInfo: BlogRelayInfo, schedules: Schedule[]): string {
    const weeks: Array<Array<[Date, Schedule[]]>> = []
    let i = 0
    const scheduleLength = schedules.length
    const startDate = new Date(blogRelayInfo.startDate)
    const calendarStartDate = dateOffset(startDate, -startDate.getDay())
    while (i < scheduleLength) {
        const week: Array<[Date, Schedule[]]> = []
        const weekStartDate = dateOffset(calendarStartDate, weeks.length * 7)
        for (let weekDay = 0; weekDay < 7; weekDay++) {
            const day: Schedule[] = []
            const date = dateOffset(weekStartDate, weekDay)
            while (i < scheduleLength && actualDateOfSchedule(blogRelayInfo, schedules[i]).getDay() === weekDay) {
                day.push(schedules[i])
                i++
            }
            week.push([date, day])
        }
        weeks.push(week)
    }
    const calendarBody = weeks
        .map((week) =>
            week
                .map((dayInfo) => {
                    const date = dayInfo[0]
                    const day = dayInfo[1]
                    const dateStr = `${date.getMonth() + 1}/${date.getDate()}`
                    const dayStr = day.map((schedule) => scheduleToStringInCalendar(schedule)).join(" ")
                    return `**${dateStr}**${dayStr}`
                })
                .join(" | "),
        )
        .join("\n")
    return `\
:day0_sunday: | :day1_monday: | :day2_tuesday: | :day3_wednesday: | :day4_thursday: | :day5_friday: | :day6_saturday:
--- | --- | --- | --- | --- | --- | ---
${calendarBody}`
}

function extractScheduleStr(pageBody: string): string {
    const lines = pageBody.split(/\r\n|\r|\n/)
    const startIndex = lines.findIndex((l: string): boolean => /^\|\s*日付.*/.test(l))
    let table = ""
    for (let i = startIndex; i < lines.length; ++i) {
        const l = lines[i]
        if (/^\s*\|.*/.test(l)) {
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
    for (let i = 2; i < lines.length; ++i) {
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
function calcDateDiff({ startDate }: BlogRelayInfo): number {
    const date = new Date(startDate)
    const dateUtcTime = date.getTime() + date.getTimezoneOffset() * 60 * 1000
    const now = new Date()
    const nowUtcTime = now.getTime() + now.getTimezoneOffset() * 60 * 1000
    const diff = nowUtcTime - dateUtcTime
    return Math.floor(diff / (1000 * 60 * 60 * 24))
}

// ブログリレー期間前のメッセージを取得する関数
// diff > 0
function getBeforeMessage(title: string, diff: number): string {
    return `# ${title}まであと ${diff}日`
}

// ブログリレー期間中のメッセージを取得する関数
// diff >= 0
function getDuringMessage(title: string, diff: number, schedules: Schedule[]): string {
    const d = diff + 1
    const ss = schedules.filter((s: Schedule): boolean => d <= s.day && s.day <= d + 1)
    if (ss.length > 0) {
        return `# ${title} ${d}日目\n${schedulesToTable(ss)}`
    }
    return `# ${title} ${d}日目\n担当者はいません`
}

// main関数を特定の時間に実行する関数
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function setTrigger(): void {
    const now = new Date()
    const props = PropertiesService.getScriptProperties()
    const setYear = now.getFullYear().toString()
    const setMonth = (now.getMonth() + 1).toString().padStart(2, "0")
    const setDate = now.getDate().toString().padStart(2, "0")
    const setHours = props.getProperty("SET_HOURS")?.padStart(2, "0")
    const setMinutes = props.getProperty("SET_MINUTES")?.padStart(2, "0")
    // トリガー登録したい時間、関数名を設定
    const setTime = new Date(`${setYear}-${setMonth}-${setDate}T${setHours}:${setMinutes}:00+09:00`)
    // newTriggerメソッドでtriggerTestを特定日時でトリガー登録
    ScriptApp.newTrigger(FUNCTION_NAME).timeBased().at(setTime).create()
    Logger.log("made trigger")
    Logger.log(setTime)
}

// 実行し終わったmainのトリガーを削除する関数
function deleteAllTrigger(): void {
    // GASプロジェクトに設定したトリガーをすべて取得
    const triggers = ScriptApp.getProjectTriggers()
    // トリガー登録のforループを実行
    for (const trigger of triggers) {
        // 取得したトリガーの関数が mainの場合、deleteTriggerで削除
        if (trigger.getHandlerFunction() !== FUNCTION_NAME) {
            continue
        }
        ScriptApp.deleteTrigger(trigger)
        Logger.log("deleted main trigger")
    }
}
