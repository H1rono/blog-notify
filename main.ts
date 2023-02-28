let props: GoogleAppsScript.Properties.Properties;

function init() {
    props = PropertiesService.getScriptProperties();
}

function main() {
    init();
    Logger.log("Hello, world");
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

function extractScheduleTable(pageBody: string): string {
    const lines = pageBody.split(/\r\n|\r|\n/);
    const startIndex = lines.findIndex((l: string): boolean => l.startsWith("|日付"));
    const table = [];
    for (var i = startIndex; i < lines.length; ++i) {
        const l = lines[i];
        if (l.startsWith("|")) {
            table.push(l);
        } else {
            break;
        }
    }
    return table.join("\n");
}
