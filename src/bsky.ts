import {AppBskyRichtextFacet, AtpAgent} from "@atproto/api";
import {bskyPW, bskyUN} from "./envSetting";

let agent : AtpAgent;

async function login() {
    await agent.login({
        identifier: bskyUN,
        password: bskyPW
    })

    console.log("Logged in");
}

export function MakeRichText(content: string, url: string, hypoName: string) {
    const post = {
        facets: [
            {
                index: {
                    byteStart: content.indexOf(url),
                    byteEnd: content.indexOf(url) + url.length,
                },
                features: [
                    {
                        $type: "app.bsky.richtext.facet#link",
                        uri: url
                    }
                ]
            }
        ]
        embed: {
            $type: "app.bsky.embed.external#view",
            external: {
                uri: url,
                title: `${hypoName}を震源とする地震情報 (日付の新しい順) - tenki.jp`,
                description: `${hypoName}を震源とする地震情報 (日付の新しい順)`,
                thumb: ""
            }
        }
    }
}

export async function BskyPost(content: string) {
    await agent.post({
        text: content
        facets: [
            {
                features:
            }
        ]
    })
}

export async function BskyWork() {
    agent = new AtpAgent({
        service: "https://bsky.social"
    })
    await login();
}