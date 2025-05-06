import { AtpAgent } from "@atproto/api";
import {bskyPW, bskyUN} from "./envSetting";

let agent : AtpAgent;

async function login() {
    await agent.login({
        identifier: bskyUN,
        password: bskyPW
    })

    console.log("Logged in");
}

export async function BskyPost(content: string) {
    await agent.post({
        text: content
    })
}

export async function BskyWork() {
    agent = new AtpAgent({
        service: "https://bsky.social"
    })
    await login();
}