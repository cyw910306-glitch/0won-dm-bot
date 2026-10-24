// 장기 토큰(60일) 주 1회 연장. Vercel Cron 이 Authorization: Bearer CRON_SECRET 로 호출.
// ponytail: 연장 결과 토큰 문자열이 바뀌면 env 를 손으로 교체해야 함. 자주 바뀌면 KV 저장으로 올릴 것.
export async function GET(req) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new Response("forbidden", { status: 403 });
  const url = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${process.env.IG_TOKEN}`;
  const j = await (await fetch(url)).json();
  if (!j.access_token) { console.error("refresh failed", JSON.stringify(j.error ?? j)); return new Response("fail", { status: 500 }); }
  const changed = j.access_token !== process.env.IG_TOKEN;
  if (changed) console.error("IG_TOKEN 이 새 값으로 바뀜: Vercel env 교체 필요");
  return Response.json({ ok: true, expires_in_days: Math.round(j.expires_in / 86400), changed });
}
