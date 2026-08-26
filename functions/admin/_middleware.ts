import cloudflareAccessPlugin from "@cloudflare/pages-plugin-cloudflare-access";

export const onRequest = cloudflareAccessPlugin({
  domain: "https://black-cake-7c75.cloudflareaccess.com",
  aud: "592fb8be261080b9b48f6afc5f4363d1aeeeba36bf346f7d5c54bb5713fe1f0c",
});
