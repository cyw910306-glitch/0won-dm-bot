# 0won DM 봇 · 인스타 댓글 → DM 자동화 (0원)

인스타 게시물에 댓글이 달리면 자동으로:

1. 댓글에 공개 답글 ("DM 보냈어요 📩")
2. 버튼 달린 DM ("받기")
3. 버튼을 누르면 **팔로우 여부 확인** → 팔로우 안 했으면 "팔로우하고 다시 눌러주세요"
4. 팔로우했으면 **자료 링크 전송**

매니챗 같은 유료 툴로 하던 "댓글 달면 DM으로 자료 보내드려요"를 내 서버(Vercel 무료)와 메타 공식 API로 직접 돌리는 코드예요. [@0won.made](https://instagram.com/0won.made) 계정에서 실제로 쓰고 있는 봇과 같은 코드입니다.

| | 이 봇 | 매니챗 (2026-03 개편 요금, 공식 도움말 기준) |
|---|---|---|
| 월 요금 | 0원 (개인·비상업 기준, 아래 한계 참고) | Free $0 (한 달 25명까지), Essential 월 $17 (연간 결제 시 $14), Pro 월 $39 |
| 팔로우 확인 | 됨 | Essential부터 |
| 키워드별 자료 | 됨 | 됨 |
| 브랜딩 문구 | 없음 | Free는 "Powered by Manychat" 표시 |
| 세팅 난이도 | **높음** (메타 앱 직접 만들기) | 낮음 (클릭 몇 번) |
| 그 외 기능 | 이 표에 있는 것만 | 시퀀스, AI, 인박스, 여러 채널 등 훨씬 많음 |

솔직히: 매니챗의 진짜 장점은 "쉽다"예요. 이 봇은 세팅을 한 번 직접 해야 하는 대신 돈이 안 들어요. 아래 단계를 그대로 따라 하거나, [AI한테 맡기는 법](#ai한테-맡기기)을 쓰세요.

## 기능

- **키워드마다 다른 자료**: 댓글에 "템플릿" → 템플릿 링크, "자료" → 자료 링크 (`lib/config.js`)
- **키워드 없는 댓글에도 DM**: "좋아요!" 같은 댓글에도 기본 자료를 보냄 (`DEFAULT`)
- **게시물별 고정 자료**: `POSTS` 에 넣은 게시물은 댓글에 다른 키워드가 있어도 항상 그 자료
- **팔로워만 링크 받기**: 켜고 끌 수 있음 (`REQUIRE_FOLLOW`)
- **날짜 예약 공개**: `from: "2026-12-01"` 이면 그날 0시(한국 시간)부터 키워드가 열림
- **중복 방지**: 같은 사람이 같은 게시물에 또 댓글을 달면 DM 없이 "이미 보냈어요" 답글만
- **DM으로 키워드만 보내도** 버튼 DM이 감
- **보안**: 메타 웹훅 서명(X-Hub-Signature-256) 검증, 웹훅 내용을 믿지 않고 API로 댓글을 다시 읽음. 비밀번호 로그인 같은 비공식 방법 안 씀.
- **토큰 자동 연장**: 매주 월요일 Vercel Cron 이 60일 토큰 연장을 시도 (아래 환경변수 참고)

## 준비물

- 인스타그램 **프로페셔널 계정**(비즈니스 또는 크리에이터), **공개 계정**
- [GitHub](https://github.com) 계정, [Vercel](https://vercel.com) 계정 (둘 다 무료)
- [Meta for Developers](https://developers.facebook.com) 계정 (페이스북 계정으로 가입)
- 페이스북 페이지 연결은 **필요 없음** (Instagram 로그인 방식 API를 씀)

## 세팅 (처음 한 번)

### 1. 배포 (Vercel)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fcyw910306-glitch%2F0won-dm-bot&env=IG_TOKEN,APP_SECRET,VERIFY_TOKEN,CRON_SECRET&envDescription=IG_TOKEN%C2%B7APP_SECRET%20%EC%9D%80%20%EC%9D%BC%EB%8B%A8%20%EC%95%84%EB%AC%B4%20%EA%B8%80%EC%9E%90%EB%82%98%20%EB%84%A3%EA%B3%A0%2C%20%EB%A9%94%ED%83%80%20%EC%84%B8%ED%8C%85%20%EB%92%A4%EC%97%90%20%EA%B5%90%EC%B2%B4&envLink=https%3A%2F%2Fgithub.com%2Fcyw910306-glitch%2F0won-dm-bot%23%ED%99%98%EA%B2%BD%EB%B3%80%EC%88%98)

버튼을 누르면 내 GitHub 에 복사본이 생기고 Vercel 에 배포돼요. 환경변수 4개를 물어보는데:

| 이름 | 지금 넣을 값 |
|---|---|
| `VERIFY_TOKEN` | 아무 긴 영문·숫자 (예: `mybot-7f3k2q9x`). 메모해 두기 |
| `CRON_SECRET` | 아무 긴 영문·숫자 (다른 값) |
| `IG_TOKEN` | 일단 `later` (3단계에서 교체) |
| `APP_SECRET` | 일단 `later` (3단계에서 교체) |

배포가 끝나면 Vercel → 프로젝트 → **Settings → Domains** 에 있는 주소(예: `https://my-dm-bot.vercel.app`)를 복사하세요. 배포 완료 화면의 긴 주소(`프로젝트-xxxx-아이디.vercel.app`)는 쓰면 안 돼요. 이 주소를 **내 주소**라고 부를게요.

`내 주소/privacy` 가 로그인 없이 열리면 성공. Vercel 로그인 화면이 뜨면 **Settings → Deployment Protection → Vercel Authentication** 을 끄세요(안 끄면 메타가 웹훅에 접속을 못 해요).

`public/privacy/index.html` 의 `@my_account` 를 내 아이디로 바꿔 두세요(메타가 개인정보처리방침 주소를 요구해요).

### 2. 메타 앱 만들기

1. [developers.facebook.com/apps](https://developers.facebook.com/apps) → **앱 만들기**
2. 사용 사례: Instagram 메시지·콘텐츠 관리 관련 항목이 보이면 그걸, 없으면 **기타** → 앱 유형 **비즈니스**
3. 왼쪽 메뉴 **Instagram** → **Instagram 로그인을 사용한 API 설정**(API setup with Instagram login)

### 3. 토큰·시크릿 받기

1. 같은 화면 **1. 액세스 토큰 생성** → 내 인스타 계정 추가 → 로그인 → **토큰 생성**. 나온 긴 문자열 = `IG_TOKEN`. 계정 옆 **웹훅 구독**(Webhook subscription) 스위치도 켜 두세요(4단계 뒤에 켜야 하면 그때)
2. **3. Instagram 비즈니스 로그인 설정** → 비즈니스 로그인 설정 → **Instagram 앱 시크릿** = `APP_SECRET`
   (어느 시크릿이 서명하는지 문서가 애매해서, `앱 설정 > 기본 설정` 의 메타 앱 시크릿까지 `시크릿1,시크릿2` 처럼 쉼표로 둘 다 넣어도 돼요)
3. Vercel → 프로젝트 → **Settings → Environment Variables** 에서 `IG_TOKEN`, `APP_SECRET` 를 진짜 값으로 바꾸고 → **Deployments → 맨 위 ⋯ → Redeploy**

⚠️ 토큰·시크릿은 비밀번호예요. 채팅·스크린샷·GitHub 에 올리지 마세요. 실수로 노출되면 토큰 다시 생성, 시크릿 재설정.

### 4. 웹훅 연결

같은 화면 **2. 웹훅 구성**:

- 콜백 URL: `내 주소/api/webhook`
- 확인 토큰: 1단계의 `VERIFY_TOKEN`
- **확인 및 저장** → 필드에서 `comments`, `messages`, `messaging_postbacks` 구독(켜기)
- **1. 액세스 토큰 생성** 의 내 계정 옆 **웹훅 구독** 스위치가 켜져 있는지 다시 확인. 이게 꺼져 있으면 연결은 "성공"인데 댓글 알림이 하나도 안 와요(제일 흔한 막힘)

### 5. 앱 게시 (라이브)

1. **앱 설정 → 기본 설정**: 개인정보처리방침 URL 과 사용자 데이터 삭제 URL 에 둘 다 `내 주소/privacy`, 카테고리·아이콘 채우기
2. 상단 **게시**(Live)
3. 내 계정 하나만 쓰는 경우(내가 관리하는 계정 = Standard Access) 메타 문서상 **앱 검수는 필요 없어요**. 실제로 @0won.made 는 게시만으로 모르는 사람 댓글에도 동작했어요(2026-10). 메타 웹훅 문서 한쪽엔 "댓글 알림에 Advanced Access 필요"라고도 적혀 있어서, 정책이 바뀌면 달라질 수 있어요.

### 6. 인스타 앱 설정 (권장)

인스타 앱 → 설정 → **메시지 및 스토리 답장 → 메시지 제어 → 연결된 도구 → 메시지 액세스 허용** 켜기

### 7. 테스트

**다른 계정**으로 내 게시물에 `자료` 라고 댓글 → 공개 답글 + DM 이 오면 끝. 내 계정 댓글은 무시하도록 만들어져 있어요.

안 오면 Vercel → 프로젝트 → **Logs** 에서 빨간 줄을 확인하세요.

## 자료·문구 바꾸기

`lib/config.js` 한 파일만 고치면 돼요. GitHub 웹에서 연필 아이콘으로 고치고 저장하면 Vercel 이 자동으로 다시 배포해요.

```js
export const ACCOUNT = "@my_account";            // 내 아이디
export const KEYWORDS = {
  템플릿: { title: "노션 템플릿", link: "https://..." },
  자료: { title: "무료 자료 모음", link: "https://..." },
};
export const DEFAULT = "자료";                    // 키워드 없는 댓글에 보낼 것 (안 보내려면 null)
export const REQUIRE_FOLLOW = true;               // 팔로우 확인 끄려면 false
```

키워드는 댓글에 **포함**되면 매칭(띄어쓰기·대소문자 무시)이고, 겹치면 위에 있는 키워드가 이겨요.

## AI한테 맡기기

[Claude Code](https://claude.com/claude-code) 같은 코딩 AI 를 쓰면 대부분 대신 해줘요(메타 화면 클릭과 토큰 복사는 직접). [SETUP-WITH-AI.md](SETUP-WITH-AI.md) 의 프롬프트를 그대로 붙여넣으세요.

## 환경변수

| 이름 | 뭔가요 |
|---|---|
| `IG_TOKEN` | 인스타 장기 토큰(60일). 매주 월요일 03:00~04:00 UTC 사이에 `/api/refresh` 가 연장 시도 (무료 플랜 크론은 그 시간 안 아무 때나 돌아요) |
| `APP_SECRET` | 웹훅 서명 검증용 시크릿. 쉼표로 여러 개 가능 |
| `VERIFY_TOKEN` | 웹훅 연결할 때 메타에 넣는 확인 토큰 |
| `CRON_SECRET` | 토큰 연장 크론 보호용. Vercel 이 자동으로 같이 보냄 |

토큰 연장: 연장 결과 토큰 문자열이 바뀌면 크론이 **실패(500)** 로 표시되고 로그에 `IG_TOKEN 이 새 값으로 바뀜` 이 떠요. 그럼 메타 화면에서 토큰을 다시 생성해 env 를 교체하세요. 60일 안에 연장하지 못하면 만료돼서 다시 생성해야 해요. 한 달에 한 번쯤 Vercel → **Cron Jobs** 에 빨간 표시가 없는지 보세요.

## 알아둘 한계 (메타·Vercel 규칙)

- **댓글당 DM 1통**: 메타 규칙상 댓글 하나에 비공개 답장은 1번. 이후 대화는 상대가 버튼을 누르거나 답장해야 이어져요. 그래서 버튼이 있어요.
- **7일**: 댓글 단 지 7일 넘으면 비공개 답장 불가.
- **시간당 750건**: 게시물·릴스 댓글 비공개 답장은 계정당 시간당 750건이 메타 한도예요.
- **중복 확인은 최근 댓글 100개 기준**: 댓글이 아주 많은 게시물에선 같은 사람에게 두 번 갈 수도 있어요.
- **"삭제" DM 은 자동 처리 안 함**: 개인정보 페이지에 적힌 삭제 요청이 오면 직접 처리하세요.
- **Vercel 무료(Hobby) 플랜은 개인·비상업 용도**예요. 판매·광고 등 상업 계정이면 Vercel 약관을 확인하고 필요하면 Pro 플랜이나 다른 서버를 쓰세요.
- 메타 정책·화면은 수시로 바뀌어요. 위 순서는 2026-10 기준.

## 점검

```bash
node test.mjs   # 가짜 메타 서버로 전체 흐름 확인 (설치 필요 없음, Node 18+)
```

## 라이선스

MIT. 마음대로 쓰고 고치고 공유하세요. 출처(@0won.made) 남겨 주시면 고마워요.
