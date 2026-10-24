// 가짜 fetch 로 전체 흐름 확인: node test.mjs
import assert from "node:assert";
import crypto from "node:crypto";

process.env.IG_TOKEN = "tok"; process.env.APP_SECRET = "other, sec"; process.env.VERIFY_TOKEN = "vt";
const calls = [];
let following = false;
let MEDIA_COMMENTS = [];
const COMMENTS = { C1: { text: "템플릿!", from: { id: "U1" } }, C2: { text: "템플릿", from: { id: "ME" } }, C3: { text: "좋아요", from: { id: "U1" }, media: { id: "M9" } } };
globalThis.fetch = async (url, opt = {}) => {
  const u = new URL(url), body = opt.body ? JSON.parse(opt.body) : null;
  calls.push({ path: u.pathname.replace("/v26.0", ""), body });
  const id = u.pathname.split("/").pop();
  if (id === "comments") return { ok: true, json: async () => ({ data: MEDIA_COMMENTS }) };
  const json = COMMENTS[id] ?? (u.searchParams.get("fields") ? { is_user_follow_business: following } : { id: "x" });
  return { ok: true, json: async () => json };
};
const { GET, POST } = await import("./api/webhook.js");
const { findKeyword, KEYWORDS } = await import("./lib/config.js");

const sign = (raw) => "sha256=" + crypto.createHmac("sha256", "sec").update(raw).digest("hex");
const dm = () => calls.find((c) => c.path === "/me/messages").body;
const post = (obj, sig) => { const raw = JSON.stringify(obj); return POST(new Request("https://x/api/webhook", { method: "POST", body: raw, headers: { "x-hub-signature-256": sig ?? sign(raw) } })); };

assert.equal(findKeyword("템플릿 주세요!"), "템플릿");
assert.equal(findKeyword("귀여워요"), undefined);
assert.equal(findKeyword("자료 템플릿"), "템플릿"); // 위에 있는 키워드가 이긴다
KEYWORDS.예약 = { title: "예약", link: "https://x", from: "2026-10-27" };
assert.equal(findKeyword("예약", Date.parse("2026-10-26T14:00:00Z")), undefined); // 한국 10/26 23시: 아직
assert.equal(findKeyword("예약", Date.parse("2026-10-26T15:00:00Z")), "예약"); // 한국 10/27 0시
delete KEYWORDS.예약;
assert.equal(await (await GET(new Request("https://x/api/webhook?hub.mode=subscribe&hub.verify_token=vt&hub.challenge=42"))).text(), "42");
assert.equal((await GET(new Request("https://x/api/webhook?hub.mode=subscribe&hub.verify_token=no&hub.challenge=42"))).status, 403);
assert.equal((await post({ entry: [] }, "sha256=bad")).status, 401);

// 1) 댓글 "템플릿" → 공개 답글 + 버튼 비공개 답장
await post({ entry: [{ id: "ME", changes: [{ field: "comments", value: { id: "C1", text: "템플릿!", from: { id: "U1" } } }] }] });
assert.equal(calls[0].path, "/C1"); // 웹훅 내용 대신 API 로 재확인
assert.deepEqual(dm().recipient, { comment_id: "C1" });
assert.equal(dm().message.attachment.payload.buttons[0].payload, "GET:템플릿");
assert.equal(calls.at(-1).path, "/C1/replies");

// 내 댓글은 무시
calls.length = 0;
await post({ entry: [{ id: "ME", changes: [{ field: "comments", value: { id: "C2", text: "템플릿", from: { id: "ME" } } }] }] });
assert.ok(calls.every((c) => !c.body));
// 키워드 없는 댓글도 DM (게시물 목록에 없으면 기본 자료)
calls.length = 0;
await post({ entry: [{ id: "ME", changes: [{ field: "comments", value: { id: "C3", text: "좋아요", from: { id: "U1" } } }] }] });
assert.equal(dm().message.attachment.payload.buttons[0].payload, "GET:자료");

// 같은 사람의 두 번째 댓글: 예전 댓글에 내 답글이 있으면 DM 없이 공개 답글만
calls.length = 0;
COMMENTS.C4 = { text: "또 남겨요", from: { id: "U1" }, media: { id: "M9" } };
MEDIA_COMMENTS = [{ id: "C3", from: { id: "U1" }, replies: { data: [{ id: "R1" }] } }, { id: "R1", from: { id: "ME" } }, { id: "C4", from: { id: "U1" } }];
await post({ entry: [{ id: "ME", changes: [{ field: "comments", value: { id: "C4" } }] }] });
assert.ok(!calls.some((c) => c.path === "/me/messages"), "두 번째 댓글엔 DM 없음");
assert.equal(calls.at(-1).path, "/C4/replies");
MEDIA_COMMENTS = [];

// 2) 버튼 클릭, 팔로우 안 함 → 팔로우 요청 버튼
calls.length = 0;
await post({ entry: [{ id: "ME", messaging: [{ sender: { id: "U1" }, postback: { payload: "GET:템플릿" } }] }] });
assert.equal(calls[0].path, "/U1");
assert.match(calls[1].body.message.attachment.payload.text, /팔로우/);

// 3) 팔로우 후 다시 클릭 → 링크
calls.length = 0; following = true;
await post({ entry: [{ id: "ME", messaging: [{ sender: { id: "U1" }, postback: { payload: "GET:템플릿" } }] }] });
assert.match(calls[1].body.message.text, /example\.com\/template/);
console.log("all checks passed");
