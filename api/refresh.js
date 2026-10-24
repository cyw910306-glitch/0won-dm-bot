// 장기 토큰(60일) 주 1회 연장. Vercel Cron 이 Authorization: Bearer CRON_SECRET 로 호출.
// ponytail: 연장 결과 토큰 문자열이 바뀌면 env 를 손으로 교체해야 함. 자주 바뀌면 KV 저장으로 올릴 것.
export async function GET(req) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new Response("forbidden", { status: 403 });
  const url = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${process.env.IG_TOKEN}`;
  const j = await (await fetch(url)).json();
  if (!j.access_token) { console.error("refresh failed", JSON.stringify(j.error ?? j)); return new Response("fail", { status: 500 }); }
  const changed = j.access_token !== process.env.IG_TOKEN;
  // 새 값이면 크론을 실패(500)로 남겨서 대시보드에서 보이게: env 를 안 바꾸면 옛 토큰이 60일 뒤 만료된다
  if (changed) console.error("IG_TOKEN 이 새 값으로 바뀜: Vercel env 교체 필요");
  return Response.json({ ok: !changed, expires_in_days: Math.round(j.expires_in / 86400), changed }, { status: changed ? 500 : 200 });
}
