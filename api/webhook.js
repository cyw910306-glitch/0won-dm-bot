// 댓글 키워드 → 공개 답글 + 버튼 DM → 버튼 누르면 팔로우 확인 → 링크 or 팔로우 요청
import { ig, validSig, button } from "../lib/ig.js";
import { KEYWORDS, POSTS, DEFAULT, PUBLIC_REPLIES, MSG, REQUIRE_FOLLOW, findKeyword, isOpen } from "../lib/config.js";

export function GET(req) {
  const q = new URL(req.url).searchParams;
  if (q.get("hub.mode") === "subscribe" && q.get("hub.verify_token") === process.env.VERIFY_TOKEN)
    return new Response(q.get("hub.challenge"));
  return new Response("forbidden", { status: 403 });
}

export async function POST(req) {
  const raw = await req.text();
  if (!validSig(raw, req.headers.get("x-hub-signature-256"), process.env.APP_SECRET))
    return new Response("bad signature", { status: 401 });
  const body = JSON.parse(raw);
  for (const entry of body.entry ?? []) {
    for (const ch of entry.changes ?? []) if (ch.field === "comments") await safe(onComment, ch.value, entry.id);
    for (const m of entry.messaging ?? []) await safe(onMessaging, m, entry.id);
  }
  return new Response("ok"); // 실패해도 200: 메타 재시도 폭주 막고 로그로 추적
}

async function safe(fn, ...a) {
  try { await fn(...a); } catch (e) { console.error(fn.name, e.message); }
}

// 같은 게시물에서 이 사람의 다른 댓글에 내 답글이 있으면 = 이미 DM 보냄(공개 답글은 DM 성공 뒤에만 달리니까).
// ponytail: 게시물당 최근 댓글 100개만 본다. 댓글이 많아지면 KV 저장으로 올릴 것.
async function alreadySent(mediaId, userId, commentId, ownerId) {
  if (!mediaId || !userId) return false;
  const { data = [] } = await ig(`/${mediaId}/comments?fields=id,from,replies&limit=100`);
  const mine = new Set(data.filter((x) => x.from?.id === ownerId).map((x) => x.id));
  return data.some((x) => x.id !== commentId && x.from?.id === userId && x.replies?.data?.some((r) => mine.has(r.id)));
}

export async function onComment(v, ownerId, replyText) {
  if (!v?.id) return;
  // 웹훅 내용을 믿지 않고 API 로 댓글을 다시 읽는다(위조 이벤트 차단: 내 게시물의 실제 댓글만 통과).
  const c = await ig(`/${v.id}?fields=text,from,media`);
  if (c.from?.id === ownerId) return; // 내 답글은 무시
  // 키워드가 있으면 그 자료, 없으면 그 게시물의 자료(어떤 댓글이든 DM)
  const kw = findKeyword(c.text) ?? POSTS[c.media?.id] ?? DEFAULT;
  if (!KEYWORDS[kw]) return; // 키워드도 기본 자료도 없으면 조용히 넘어간다
  const publicReply = (message) => safe(async function publicReply() { await ig(`/${v.id}/replies`, { method: "POST", body: { message } }); });
  if (await alreadySent(c.media?.id, c.from?.id, v.id, ownerId)) return publicReply(replyText ?? MSG.again); // 두 번째 댓글: DM 없이 답글만
  // 댓글당 1회만 가능한 비공개 답장. 버튼이 있어야 상대가 눌러서 대화창이 열린다.
  // 먼저 보내고 성공했을 때만 공개 답글: 같은 이벤트가 다시 와도 두 번째는 여기서 실패해 답글 도배가 안 생긴다.
  await ig("/me/messages", {
    method: "POST",
    body: { recipient: { comment_id: v.id }, message: button(MSG.ask(KEYWORDS[kw].title), MSG.askBtn, `GET:${kw}`) },
  });
  await publicReply(replyText ?? PUBLIC_REPLIES[Math.floor(Math.random() * PUBLIC_REPLIES.length)]);
}

export async function onMessaging(m, ownerId) {
  const from = m.sender?.id;
  if (!from || from === ownerId || m.message?.is_echo) return;
  const payload = m.postback?.payload ?? m.message?.quick_reply?.payload;
  const kw = payload?.startsWith("GET:") ? payload.slice(4) : findKeyword(m.message?.text);
  if (!kw || !isOpen(kw)) return;
  const send = (message) => ig("/me/messages", { method: "POST", body: { recipient: { id: from }, message } });
  if (!payload) return send(button(MSG.ask(KEYWORDS[kw].title), MSG.askBtn, `GET:${kw}`)); // DM으로 키워드만 친 경우
  const { is_user_follow_business } = REQUIRE_FOLLOW ? await ig(`/${from}?fields=is_user_follow_business`) : { is_user_follow_business: true };
  if (is_user_follow_business) return send({ text: MSG.link(KEYWORDS[kw].title, KEYWORDS[kw].link) });
  return send(button(MSG.follow, MSG.followBtn, `GET:${kw}`));
}
