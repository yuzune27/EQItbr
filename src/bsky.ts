import {AppBskyFeedPost, AppBskyRichtextFacet, AtpAgent} from "@atproto/api";
import {bskyPW, bskyUN} from "./envSetting";
import {delay} from "./delay";

let agent : AtpAgent;

async function login() {
    await agent.login({
        identifier: bskyUN,
        password: bskyPW
    })

    console.log("Logged in");
}

export async function BskyRichPost(content: string, url: string, hypoName: string) {
    const encoder = new TextEncoder();
    const linkStart = encoder.encode(content).byteLength;
    const linkEnd = linkStart + encoder.encode(url).byteLength;

    const postText = `${content}${url}`;

    let imgUrl : string;
    let title : string;
    let description : string;

    if (url.includes("tenki.jp")) {
        imgUrl = "https://raw.githubusercontent.com/yuzune27/EQItbr/refs/heads/main/img/tenkiJpThumb.jpg";
        title = `${hypoName}を震源とする地震情報 (日付の新しい順) - tenki.jp`;
        description = `${hypoName}を震源とする地震情報 (日付の新しい順)`;
    } else {
        imgUrl = "https://raw.githubusercontent.com/yuzune27/EQItbr/refs/heads/main/img/jmaData.png";
        title = "気象庁震度データベース";
        description = "1919年から2日前までの期間で、過去に震度1以上を観測した地震を県別・観測点別に検索できます。";
    }

    const blob = await fetch(imgUrl);
    const buffer = await blob.arrayBuffer();
    const blobRef = await agent.uploadBlob(new Uint8Array(buffer));

    const facetsParams: AppBskyRichtextFacet.Main[] = [
        {
            index: {
                byteStart: linkStart,
                byteEnd: linkEnd,
            },
            features: [{ $type: "app.bsky.richtext.facet#link", uri: url }],
        },
    ];



    const embedParams: AppBskyFeedPost.Record["embed"] = {
        $type: "app.bsky.embed.external",
        external: {
            uri: url,
            thumb: {
                $type: "blob",
                ref: {
                    $link: blobRef.data.blob.ref.toString(),
                },
                mimeType: blobRef.data.blob.mimeType,
                size: blobRef.data.blob.size,
            },
            title: title,
            description: description
        },
    };

    const postParams : AppBskyFeedPost.Record = {
        $type: "app.bsky.feed.post",
        text: postText,
        facets: facetsParams,
        embed: embedParams,
        createdAt: new Date().toISOString(),
    };
    await agent.post(postParams);
}

export async function BskyPost(content: string) {
    await agent.post({
        text: content,
    })
}

export async function BskyWork() {
    agent = new AtpAgent({
        service: "https://bsky.social"
    })
    await login();
}

/*
async function test() {
    await BskyWork();
    const str : string = "6日 15時16分頃発生した和歌山県北部震源の地震は、18時間19分ぶり。\n（前回発生は2025.5.5でした。）\n\n"
    const url : string = "https://earthquake.tenki.jp/bousai/earthquake/center/550/";
    const hypoName : string = "和歌山県北部";
    await BskyRichPost(str, url, hypoName);
}
*/