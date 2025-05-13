import {dmdataToken} from "./envSetting";
import {delay} from "./delay";
import {dateDiff, diffDateText, DiffDT, getExp, parseOt} from "./calcDate";
import {BskyRichPost} from "./bsky";

function jmaEQSearch(date : Date, epi : string)
{
    const ReqDict : { [key : string] : any} =
        {
            "mode": "search",
            "dateTimeF": ["1919-01-01", "00:00"],
            "dateTimeT": [`${date.getFullYear()}-${String(date.getMonth() + 1)}-${date.getDate()}`, "23:59"],
            "mag": ["0.0", "9.9"],
            "dep": ["000", "999"],
            "epi": [epi],
            "pref": ["99"],
            "city": ["99"],
            "station": ["99"],
            "obsInt": "1",
            "maxInt": "1",
            "additionalC": true,
            "Sort": "S0",
            "Comp": "C0",
            "seisCount": false,
            "observed": false,
            "strParam": "[object Object]"
        };
    return ReqDict;
}

async function JmaDB(epi: string, dtSubtr : number = 2) {  // 最新情報は基本的に2日前まで
    const url : string = "https://www.data.jma.go.jp/eqdb/data/shindo/api/";
    const formData = new FormData();
    const dtNow = new Date();
    dtNow.setDate(dtNow.getDate() - dtSubtr)
    for (const [k, v] of Object.entries(jmaEQSearch(dtNow, epi)))
    {
        if (typeof v === "object")
        {
            v.forEach((value: string) => formData.append(k + "[]", value))
        } else
        {
            formData.append(k, v);
        }
    }

    const resp : Response = await fetch(url, {
        method: "POST",
        body: formData
        }
    );
    const json = await resp.json();
    if (typeof json["res"] === "string") {
        if (json["res"].includes("データはありません")) {  // 検索終了日時の設定を見直す
            return JmaDB(epi, 3);
        } else if (json["res"].includes("ありませんでした")) {  // 検索結果がない
            return null;
        } else {
            return;
        }
    }
    return json;
}

function TokenEncode() : string {
    return btoa(String.fromCharCode(...Array.from(new TextEncoder().encode(dmdataToken + ":"))));
}

async function DmGDEql(hypoNo? : string) {
    let url : string = "https://api.dmdata.jp/v2/gd/earthquake?limit=2";
    if (typeof hypoNo !== "undefined") {
        url += `&hypocenter=${hypoNo}`;
    }
    const encToken : string = TokenEncode();

    const headers : { [key : string] : string } = {
        "Authorization": "Basic " + encToken
    }

    const resp : Response = await fetch(url, {
        method: "GET",
        headers: headers
    });

    const json = await resp.json();
    if (json["items"][0]["type"] == "normal") {
        return json;
    }
    return;  // おそらく遠地
}

async function DmGdEqe(eventId : string) {
    const url : string = `https://api.dmdata.jp/v2/gd/earthquake/${eventId}`;
    const encToken : string = TokenEncode();

    const headers : { [key : string] : string } = {
        "Authorization": "Basic " + encToken
    }

    const resp : Response = await fetch(url, {
        method: "GET",
        headers: headers
    });

    return await resp.json();
}

export async function ReqWork() {
    const resp = await DmGDEql();
    const json = resp["items"][0];
    let tmpEventId : string = json["eventId"];

    let eventId : string = tmpEventId;
    let hypoCode : string;
    let hypoName : string;

    // noinspection InfiniteLoopJS
    while (true)
    {
        do
        {
            await delay(15000);
            const resp = await DmGDEql();
            if (typeof resp === "undefined") continue;
            const json = resp["items"];
            eventId = json[0]["eventId"];
            // const newOT : Date = new Date(json[0]["originTime"]);
            // const recentOT : Date = new Date(json[1]["originTime"]);
        } while (eventId == tmpEventId);
        const eventResp = await DmGdEqe(eventId);
        const telegramsType : string = eventResp["event"]["telegrams"][0]["head"]["type"];
        if (telegramsType != "VXSE53") continue;
        tmpEventId = eventId;

        try {
            hypoCode = json["hypocenter"]["code"];
            hypoName = json["hypocenter"]["name"];
        } catch (e) {
            continue;
        }

        let diffStr : string;
        // @ts-ignore
        let jmaJson = await JmaDB(hypoName);
        const jmaOt : Date = parseOt(jmaJson["res"][0]["ot"]);
        const jmaId : string = jmaJson["res"][0]["id"];
        if (jmaOt === null) {
            console.log("データが取得できませんでした。");
        } else {
            // @ts-ignore
            if (typeof hypoCode === "undefined") continue;
            const hypoResp = await DmGDEql(hypoCode)
            const hypoJson = hypoResp["items"];
            const newOT : Date = new Date(hypoJson[0]["originTime"]);  // 最新の発生時刻
            const recentOT : Date = new Date(hypoJson[1]["originTime"]);  // 一つ前の発生時刻

            if (typeof newOT === "undefined" || typeof recentOT === "undefined") continue;
            const newOtText : string = `${newOT.getDate().toString().padStart(2, "0")}日 ` +
                `${newOT.getHours().toString().padStart(2, "0")}時` + `${newOT.getMinutes().toString().padStart(2, "0")}分`;

            let source : string;
            let sourceUrl : string;

            const diff : DiffDT = dateDiff(recentOT, newOT)  // 現在時刻を起点に2日以上はデータベース参照
            let exp : string | undefined;
            let recentOtText : string;
            if (diff.years < 1 && diff.months < 1 && diff.days <= 2 && diff.hours <= 12) {
                exp = getExp(diff);
                diffStr = diffDateText(diff);
                recentOtText = `${recentOT.getFullYear()}.${(recentOT.getMonth() + 1).toString().padStart(2, "0")}.${recentOT.getDate().toString().padStart(2, "0")} ` +
                    `${recentOT.getHours().toString().padStart(2, "0")}:${recentOT.getMinutes().toString().padStart(2, "0")}`;
                // @ts-ignore

                source = "気象庁・DmData";
                // @ts-ignore
                sourceUrl = `https://earthquake.tenki.jp/bousai/earthquake/center/${hypoCode}/`;
            } else {
                const diff1 : DiffDT = dateDiff(jmaOt, newOT);  // データベース最新　→　最新発生
                exp = getExp(diff1);
                diffStr = diffDateText(diff1);
                recentOtText = `${jmaOt.getFullYear()}.${(jmaOt.getMonth() + 1).toString().padStart(2, "0")}.${jmaOt.getDate().toString().padStart(2, "0")} ` +
                    `${jmaOt.getHours().toString().padStart(2, "0")}:${jmaOt.getMinutes().toString().padStart(2, "0")}`;

                source = "気象庁震度データベース";
                sourceUrl = `https://www.data.jma.go.jp/eqdb/data/shindo/#${jmaId}`
            }

            if (typeof exp !== "undefined") {
                exp = `【${exp}震源】\n`;
            } else {
                exp = "";
            }

            // @ts-ignore
            const content : string = `${exp}${newOtText}頃発生した「${hypoName}」震源の地震は、${diffStr}。\n（前回発生は${recentOtText}でした。）\n\nソース：${source}\n`;
            // @ts-ignore
            await BskyRichPost(content, sourceUrl, hypoName);
        }
        // const jstStr : string = originTime.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
    }
}

/*
async function test() {
    console.log(await JmaDB("東京都２３区"));
}
*/