import dotenv from "dotenv"

dotenv.config();
// dotenv.config({ path: "../.env" });

export const dmdataToken = process.env.DMDATA_TOKEN;

export const bskyUN = process.env.BLUESKY_USERNAME;
export const bskyPW = process.env.BLUESKY_PASSWORD;