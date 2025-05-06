import {dmdataToken} from "./envSetting";
import {delay} from "./delay";
import {dateDiff, diffDateText, DiffDT, getExp, parseOt} from "./calcDate";
import {BskyPost} from "./bsky";

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

async function JmaDB(epi: string, dtSubtr : number = 3) {  // 最新情報は基本的に3日前まで
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
            return JmaDB(epi, 4);
        } else if (json["res"].includes("ありませんでした")) {  // 検索結果がない
            return null;
        } else {
            return;
        }
    }
    return json;
}

async function DmGDEql(hypoNo? : string) {
    let url : string = "https://api.dmdata.jp/v2/gd/earthquake?limit=2";
    if (typeof hypoNo !== "undefined") {
        url += `&hypocenter=${hypoNo}`;
    }
    const encToken : string = btoa(String.fromCharCode(...Array.from(new TextEncoder().encode(dmdataToken + ":"))))

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
        while (tmpEventId == eventId)
        {
            await delay(15000);
            const resp = await DmGDEql();
            if (typeof resp === "undefined") continue;
            const json = resp["items"];
            eventId = json[0]["eventId"];
            hypoCode = json[0]["hypocenter"]["code"];
            hypoName = json[0]["hypocenter"]["name"];
            // const newOT : Date = new Date(json[0]["originTime"]);
            // const recentOT : Date = new Date(json[1]["originTime"]);
        }
        tmpEventId = eventId;

        let diffStr : string;
        // @ts-ignore
        let jmaJson = await JmaDB(hypoName);
        const jmaOt : Date = parseOt(jmaJson["res"][0]["ot"]);
        if (jmaOt === null) {
            console.log("データが取得できませんでした。");
        } else {
            // @ts-ignore
            const hypoResp = await DmGDEql(hypoCode)
            const hypoJson = hypoResp["items"];
            const newOT : Date = new Date(hypoJson[0]["originTime"]);  // 最新の発生時刻
            const recentOT : Date = new Date(hypoJson[1]["originTime"]);  // 一つ前の発生時刻

            if (typeof newOT === "undefined" || typeof recentOT === "undefined") continue;
            const newOtText : string = `${newOT.getDate()}日 ` +
                `${newOT.getHours().toString().padStart(2, "0")}時` + `${newOT.getMinutes().toString().padStart(2, "0")}分`;

            const diff : DiffDT = dateDiff(recentOT, newOT)  // 現在時刻を起点に3日以上はデータベース参照
            let exp : string | undefined;
            let recentOtText : string;
            if (diff.days >= 3) {
                const diff1 : DiffDT = dateDiff(jmaOt, newOT);  // データベース最新　→　最新発生
                exp = getExp(diff1);
                diffStr = diffDateText(diff1);
                recentOtText = `${jmaOt.getFullYear()}.${jmaOt.getMonth() + 1}.${jmaOt.getDate()}`;
            } else {
                exp = getExp(diff);
                diffStr = diffDateText(diff);
                recentOtText = `${recentOT.getFullYear()}.${recentOT.getMonth() + 1}.${recentOT.getDate()}`;
            }

            if (typeof exp !== "undefined") {
                exp = `【${exp}震源】\n`;
            } else {
                exp = "";
            }

            // @ts-ignore
            const content : string = `${exp}${newOtText}頃発生した${hypoName}震源の地震は、${diffStr}。\n（前回発生は${recentOtText}でした。）\n\nhttps://earthquake.tenki.jp/bousai/earthquake/center/${hypoCode}/`
            await BskyPost(content);
        }
        // const jstStr : string = originTime.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
    }
}

/*
async function test() {
    console.log(await JmaDB("東京都２３区"));
}
*/