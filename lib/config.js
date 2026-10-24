// 여기 한 파일만 고치면 된다. 고친 뒤 GitHub 에 올리면(또는 vercel --prod) 자동 재배포.

// 내 인스타 아이디(@ 포함). 팔로우 요청 문구에 들어간다.
export const ACCOUNT = "@my_account";

// 댓글 키워드 → 보낼 자료. 댓글에 키워드가 "포함"되면 매칭(대소문자·띄어쓰기 무시).
// 겹치면 위에 있는 키워드가 이긴다("무료 템플릿" → 템플릿보다 무료가 위면 무료).
// from: "YYYY-MM-DD" 를 넣으면 그날(한국 날짜)부터 열린다. 그 전엔 없는 키워드 취급.
export const KEYWORDS = {
  템플릿: { title: "노션 템플릿", link: "https://example.com/template" },
  자료: { title: "무료 자료 모음", link: "https://example.com/free" },
  // 예약 공개 예시: 다음 주 게시물용
  // 이벤트: { title: "이벤트 쿠폰", link: "https://example.com/event", from: "2026-12-01" },
};

// 키워드 없는 댓글("좋아요!")에도 DM: 게시물 미디어 ID → 키워드. 목록에 없는 게시물은 DEFAULT.
// 미디어 ID 는 Vercel 로그(Functions)에서 댓글 이벤트가 올 때 보인다. 비워 둬도 된다.
export const POSTS = {
  // "18000000000000000": "템플릿",
};
// 키워드 없는 댓글에 보낼 기본 자료. 아무 댓글에도 DM 을 보내기 싫으면 null.
export const DEFAULT = "자료";

export const PUBLIC_REPLIES = ["DM 보냈어요 📩", "DM 확인해 주세요 🙂", "보내드렸어요! DM 함께 확인해 주세요"];

export const MSG = {
  ask: (t) => `댓글 고마워요! ${t} 보내드릴게요 👇`,
  askBtn: "받기",
  link: (t, url) => `여기요! ${t} → ${url}`,
  follow: `팔로우하면 바로 열려요! ${ACCOUNT} 팔로우하고 아래 버튼 한 번만 다시 눌러주세요`,
  followBtn: "팔로우 했어요",
  again: "이미 DM 보내드렸어요 🙂 DM함 확인해 주세요!",
};

// 팔로우 확인 없이 바로 링크를 주려면 false.
export const REQUIRE_FOLLOW = true;

export function isOpen(k, now = Date.now()) {
  const from = KEYWORDS[k]?.from;
  return !!KEYWORDS[k] && (!from || new Date(now + 9 * 3600e3).toISOString().slice(0, 10) >= from);
}

export function findKeyword(text = "", now = Date.now()) {
  const t = text.replace(/\s+/g, "").toLowerCase();
  return Object.keys(KEYWORDS).find((k) => t.includes(k.toLowerCase()) && isOpen(k, now));
}
