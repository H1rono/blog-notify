let props: GoogleAppsScript.Properties.Properties;
const WRITER_REGEXP = /@[a-zA-Z0-9_-]+/g;

function init() {
    props = PropertiesService.getScriptProperties();
}

function main() {
    init();
    const pageBody = getCrowiPageBody("/Event/welcome/23/新歓ブログリレー");
    const schedule = extractSchedule(pageBody);
    const messageContent = `現在のブログリレー予定表:

| 日付 | 日目 | 担当者 | タイトル(内容) |
| :-: | :-: | :-: | :-- |
${schedule.map(scheduleToString).join("\n")}`;
    const res = postMessage(messageContent);
    Logger.log(res.getResponseCode());
}

function getCrowiPageBody(path: string): string {
    const host = props.getProperty("CROWI_HOST");
    const token = props.getProperty("CROWI_ACCESS_TOKEN");
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
        embed: false,
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
