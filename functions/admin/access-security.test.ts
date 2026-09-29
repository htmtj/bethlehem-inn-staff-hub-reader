import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { onRequest } from "./_middleware";
import { accessConfig } from "./access-config";

let pair: CryptoKeyPair;
let publicKey: JsonWebKey;
beforeAll(async () => {
  pair = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  publicKey = { ...await crypto.subtle.exportKey("jwk", pair.publicKey), kid: "synthetic-key", alg: "RS256" } as JsonWebKey;
});
afterEach(() => vi.unstubAllGlobals());
async function token(overrides: Record<string, unknown> = {}, alg = "RS256") {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const value = `${encode({ alg, kid: "synthetic-key" })}.${encode({ email: "synthetic@example.invalid", iss: accessConfig.domain, aud: [accessConfig.aud], exp: now + 3600, nbf: now - 10, ...overrides })}`;
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", pair.privateKey, new TextEncoder().encode(value));
  return `${value}.${Buffer.from(signature).toString("base64url")}`;
}
async function request(jwt?: string) {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ keys: [publicKey] })));
  const next = vi.fn(async () => new Response("Allowed"));
  const response = await onRequest({ request: new Request("https://hub.example.invalid/admin/api/session", { headers: jwt ? { "Cf-Access-Jwt-Assertion": jwt } : {} }),
    env: {}, data: {}, functionPath: "/admin", next, waitUntil() {}, passThroughOnException() {} } as never);
  return { response, next };
}
describe("actual Access middleware with synthetic signing keys", () => {
  it("accepts a correctly signed current token for the configured audience", async () => {
    const result = await request(await token());
    expect(result.response.status).toBe(200); expect(result.next).toHaveBeenCalledOnce();
  });
  it.each([{ exp: 1 }, { nbf: 9999999999 }, { aud: ["other-application"] }, { iss: "https://other.example.invalid" }])("rejects signed invalid claims %j", async claims => {
    const result = await request(await token(claims));
    expect(result.response.status).toBe(302); expect(result.next).not.toHaveBeenCalled();
  });
  it("rejects missing, unsigned-algorithm and tampered assertions", async () => {
    const signed = await token();
    const [header, body, signature] = signed.split(".");
    const altered = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, "base64url").toString()), email: "forged@example.invalid" })).toString("base64url");
    for (const jwt of [undefined, "forged", await token({}, "none"), `${header}.${altered}.${signature}`]) {
      const result = await request(jwt);
      expect(result.response.status).toBe(302); expect(result.next).not.toHaveBeenCalled();
    }
  });
});
