let props: GoogleAppsScript.Properties.Properties;
const WRITER_REGEXP = /@[a-zA-Z0-9_-]+/g;
const NOTICE_MESSAGE = `
## 注意事項
- \`新歓ブログリレー2023\`のタグをつけてください
- 記事の初めにブログリレー何日目の記事かを明記してください
- 記事の最後に次の日の担当者を紹介してください
- **post imageを設定して**ください
- わからないことがあれば気軽に #event/welcome/blog/buri まで`;

function init() {
    props = PropertiesService.getScriptProperties();
}

function main() {
    init();
    const pageBody = getCrowiPageBody();
    const schedules = extractSchedule(pageBody);
    const dateDiff = calcDateDiff();
    const messageHead = dateDiff < 0 ? getBeforeMessage(-dateDiff) : getDuringMessage(dateDiff, schedules);
    const res = postMessage(messageHead + NOTICE_MESSAGE);
    Logger.log(res.getResponseCode());
    // Logger.log(messageHead + NOTICE_MESSAGE);
}

function getCrowiPageBody(): string {
    const host = props.getProperty("CROWI_HOST");
    const token = props.getProperty("CROWI_ACCESS_TOKEN");
    const path = props.getProperty("CROWI_PAGE_PATH");
    const encodedPath = encodeURI(path);
    const url = `https://${host}/_api/pages.get?access_token=${token}&path=${encodedPath}`;
    const res = UrlFetchApp.fetch(url);
    const payload = JSON.parse(res.getContentText());
    return payload["page"]["revision"]["body"] as string;
}

function postMessage(content: string): GoogleAppsScript.URL_Fetch.HTTPResponse {
    const host = props.getProperty("BOT_HOST");
    const token = props.getProperty("BOT_VERIFICATION_TOKEN");
    const channelId = props.getProperty("TRAQ_CHANNEL_ID");
    const url = `http://${host}/api/say`;
    const payload = {
        channelId: channelId,
        content: content,
        embed: true,
    };
    const params: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
        method: "post",
        contentType: "application/json",
        headers: {
            "X-TRAQ-BOT-TOKEN": token,
        },
        payload: JSON.stringify(payload),
    };
    return UrlFetchApp.fetch(url, params);
}

type Schedule = {
    date: string;
    day: number;
    writer: string;
    summary: string;
};

function scheduleToString(s: Schedule): string {
    let writers = Array.from(s.writer.matchAll(WRITER_REGEXP))
        .map((match) => match[0])
        .join(", ");
    return `| ${s.date} | ${s.day} | ${writers} | ${s.summary} |`;
}

function schedulesToTable(schedules: Schedule[]): string {
    return `\
| 日付 | 日目 | 担当者 | タイトル(内容) |
| :-: | :-: | :-- | :-- |
${schedules.map(scheduleToString).join("\n")}`;
}

function extractSchedule(pageBody: string): Schedule[] {
    const lines = pageBody.split(/\r\n|\r|\n/);
    const startIndex = lines.findIndex((l: string): boolean => l.startsWith("|日付"));
    const table: Schedule[] = [];
    for (var i = startIndex + 2; i < lines.length; ++i) {
        const l = lines[i];
        if (l.startsWith("|")) {
            // | 日付 | 日目 | 担当者 | タイトル(内容) |
            const cells = l
                .split("|")
                .slice(1, -1)
                .map((c: string): string => c.trim());
            const s: Schedule = {
                date: cells[0],
                day: parseInt(cells[1]),
                writer: cells[2],
                summary: cells[3],
            };
            if (s.writer.length === 0) {
                continue;
            }
            if (s.date === "同上") {
                s.date = table[table.length - 1].date;
            }
            table.push(s);
        } else {
            break;
        }
    }
    return table;
}

// START_DATEとの差分を取得する
// now - date
function calcDateDiff(): number {
    const date = new Date(props.getProperty("START_DATE"));
    const dateUtcTime = date.getTime() + date.getTimezoneOffset() * 60 * 1000;
    const now = new Date();
    const nowUtcTime = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
    const diff = nowUtcTime - dateUtcTime;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// ブログリレー期間前のメッセージを取得する関数
// diff > 0
function getBeforeMessage(diff: number): string {
    return `# 新歓ブログリレーまであと ${diff}日`;
}

// ブログリレー期間中のメッセージを取得する関数
// diff >= 0
function getDuringMessage(diff: number, schedules: Schedule[]): string {
    const d = diff + 1;
    const ss = schedules.filter((s: Schedule): boolean => d <= s.day && s.day <= d + 1);
    if (ss.length > 0) {
        return `# 新歓ブログリレー ${d}日目\n担当者:\n${schedulesToTable(ss)}`;
    }
    return `# 新歓ブログリレー ${d}日目\n担当者はいません`;
}
