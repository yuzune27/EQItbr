import {BskyWork} from "./src/bsky";
import {ReqWork} from "./src/req";

async function main() {
    await BskyWork();
    await ReqWork();
}

main();
