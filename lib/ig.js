// Instagram API with Instagram Login (graph.instagram.com). 토큰은 Vercel env IG_TOKEN.
import crypto from "node:crypto";

const BASE = "https://graph.instagram.com/v26.0";

export async function ig(path, { method = "GET", body } = {}) {
  const url = new URL(BASE + path);
  url.searchParams.set("access_token", process.env.IG_TOKEN);
  const r = await fetch(url, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${method} ${path} ${r.status} ${JSON.stringify(j.error ?? j)}`);
  return j;
}

// 메타 웹훅 서명(X-Hub-Signature-256 = sha256=HMAC(app secret, raw body)) 검증.
// APP_SECRET 은 쉼표로 여러 개 가능(메타 앱 시크릿, 인스타 앱 시크릿 중 어느 쪽이 서명하든 통과).
export function validSig(raw, header, secrets) {
  if (!header || !secrets) return false;
  return secrets.split(",").some((s) => {
    const want = "sha256=" + crypto.createHmac("sha256", s.trim()).update(raw).digest("hex");
    return want.length === header.length && crypto.timingSafeEqual(Buffer.from(want), Buffer.from(header));
  });
}

export const button = (text, title, payload) => ({
  attachment: { type: "template", payload: { template_type: "button", text, buttons: [{ type: "postback", title, payload }] } },
});
