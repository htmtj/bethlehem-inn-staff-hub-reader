import { describe, expect, it } from "vitest";
import { accessConfig } from "./access-config";

describe("Cloudflare Access configuration", () => {
  it("matches the verified production team and application audience", () => {
    expect(accessConfig).toEqual({
      domain: "https://bi-operations.cloudflareaccess.com",
      aud: "592fb8be261080b9b48f6afc5f4363d1aeeeba36bf346f7d5c54bb5713fe1f0c",
    });
  });
});
