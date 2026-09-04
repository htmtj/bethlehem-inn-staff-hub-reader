import cloudflareAccessPlugin from "@cloudflare/pages-plugin-cloudflare-access";
import { accessConfig } from "./access-config";

export const onRequest = cloudflareAccessPlugin(accessConfig);
