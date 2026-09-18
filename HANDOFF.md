# HANDOFF — 답변서랍 (answer-drawer)

갱신: 2026-09-18 (Claude). 이전 인계 문서: `answer-drawer-claude-handoff-20260918-145152.zip` 의 CLAUDE_HANDOFF.md (요구사항 원문).

## 2026-09-18 16:40 추가 (프리캔버스 기능 세션이 반영 — 사장님 지시 "CS 서랍 이름 붙여 상단바에, 베이직 이상")

- 프리캔버스 안 이름은 **「CS 답변서랍」**. 프리캔버스 웹 상단 메뉴에 붙었고(런처 창: 사이드패널 열기 / 웹에서 열기 / 설치 안내), 베이직 플랜 이상(활성 구독)·관리자만 연다. 이 저장소에서도 제목·브랜드·auth 문구를 「CS 답변서랍」으로 바꿨다(layout.tsx, index.html, auth.html, auth-page.ts, page.tsx).
- **Firestore 규칙**: marketgen-ai `firestore.rules` 의 `answerDrawer/{uid}` create/update 를 `canWriteDrawer()`(소유자 && (관리자 || plan 클레임 basic/pro/max/exclusive))로 게이트해 **배포함(16:33 KST)**. 읽기·삭제는 소유자 그대로. `emulator/firestore.rules` 와 `tests/rules.test.mjs` 도 같은 게이트로 갱신(무구독 사용자 free 는 읽기만 성공). 클레임은 프리캔버스 서버 `syncPlanClaims` 가 결제·부여 시점과 매일 스위프에서 발급한다 — 구독 직후에는 재로그인(토큰 갱신)이 필요할 수 있다.
- **UI**: `hooks/use-drawer.ts` 의 쓰기 permission-denied 문구를 요금제 안내(`PLAN_MESSAGE`)로 바꿨다. 로컬 모드는 그대로 동작한다.
- **확장 브릿지(0.3.1, marketgen-ai)**: 프리캔버스 웹 → `content-app.js`(`OPEN_ANSWER_DRAWER`) → `background.js`(`answer-drawer-open` → `chrome.sidePanel.open`). sync 스크립트는 `answer-drawer/` 폴더만 복사하므로 영향 없음 — popup/content-app/background 는 덮어쓰지 말 것.
- 이 변경으로 `npm run build` → `npm run sync:freecanvas` 를 돌려 marketgen-ai 확장 폴더(0.3.2)에 반영했고, GitHub secrets(VITE_FIREBASE_* 6개)를 등록한 뒤 main 을 푸시했다(Pages Actions 결과는 marketgen HANDOFF 9/18 9차 참고).

## 지금 상태

- **Google 로그인 + Firestore 동기화 구현 완료(로컬 검증 완료, 미배포).** 웹(GitHub Pages)과 확장 사이드패널이 같은 Google 계정으로 같은 `answerDrawer/{uid}` 데이터를 실시간으로 읽고 쓴다.
- **확장은 별도 앱이 아니라 「프리캔버스AI 보조」 확장(marketgen-ai `chrome-extension/marketgen-smartstore`)에 사이드패널로 통합**했다(사장님 지시 2026-09-18). 기존 answer-drawer 전용 확장(manifest/background/bridge)과 「확장프로그램으로 보내기」 수동 전송은 제거했다.
- Firebase 는 프리캔버스 프로젝트 **marketgen-ai-87525** 를 재사용한다(매칭체커와 같은 방식). 승인 도메인에 `ramiteacher.github.io` 는 이미 등록돼 있고 API 키 도메인 제한도 없어 콘솔 작업이 필요 없었다.
- 로컬 소스: `C:\Users\라미교수\playground\answer-drawer\repo` (원격 https://github.com/ramiteacher/answer-drawer, 기준 커밋 b33dd4d). 원격에는 아직 푸시하지 않았다.

## 검증한 것 (2026-09-18, 에뮬레이터 + 내장 브라우저)

- `npm run typecheck` 0 오류, `npm test` 11/11, `npm run build` 성공, `npm run test:rules` 4/4(Firestore 에뮬레이터, 타 UID·미인증·컬렉션그룹·잘못된 필드 거부 확인).
- 에뮬레이터(demo-answer-drawer)에서: 로컬 데이터 최초 로그인 이전(meta+stores+replies 생성, `answer-drawer:migrated` 마커) → 서버 직접 쓰기(확장 역할)가 웹에 1.5초 안에 반영 → 둘째 탭이 자동 로그인 후 같은 데이터 → 둘째 탭에서 만든 답변이 첫 탭에 반영(order -2) → 로그아웃 시 계정 데이터 숨김·리스너 해제(로그아웃 뒤 서버 쓰기 미반영) → 다른 계정(bob) 로그인 시 기본 상태만 표시(alice 데이터 없음, 로컬 데이터는 alice 에만 이전) → alice 재로그인 시 4건 전부 복원 → 클라우드 모드 「이전 백업 복원」 왕복.
- 병합한 marketgen-ai `firestore.rules` 가 에뮬레이터에서 컴파일됨.
- **미검증**: 실제 Chrome 에서 프리캔버스 확장 압축해제 로드 → 사이드패널 → Google 로그인(offscreen 경로). 코드는 Firebase 공식 MV3 패턴이고 offscreen 메시지 배선은 단위 테스트했지만 실클릭 검증은 사용자 몫. 실제 Google 팝업(운영 프로젝트) 로그인도 배포 후 확인 필요.

## 배포 절차 (승인 후 — 순서 중요)

1. **Firestore 규칙**: marketgen-ai 폴더에서 `firebase deploy --only firestore:rules` (answerDrawer 블록 포함). 규칙이 먼저 나가야 로그인 후 permission-denied 가 없다.
2. **GitHub secrets**: answer-drawer 저장소에 `VITE_FIREBASE_API_KEY / AUTH_DOMAIN / PROJECT_ID / STORAGE_BUCKET / MESSAGING_SENDER_ID / APP_ID` 등록 (`gh secret set NAME --repo ramiteacher/answer-drawer --body VALUE`, 값은 `.env.local`). 없으면 빌드가 실패한다.
3. **웹 푸시**: answer-drawer `main` 푸시 → Actions 성공 → https://ramiteacher.github.io/answer-drawer/ 에서 Google 로그인 확인. `auth.html` 도 함께 배포된다(확장 로그인이 이 페이지에 의존).
4. **확장**: marketgen-ai 의 확장 변경(0.3.0: manifest key/sidePanel/offscreen/side_panel, background 인증 리스너, popup 「답변서랍 열기」, `answer-drawer/` 폴더, README)을 커밋·푸시하면 freecanvas.ai.kr 의 다운로드 ZIP(`public/downloads/freecanvas-ai-helper.zip`)이 갱신된다. 웹스토어는 0.3.0 재심사 제출 필요(사유 문구는 확장 README 참고). 웹스토어 ZIP 업로드가 `key` 때문에 거부되면 그 ZIP 에서만 `key` 를 지운다.
5. 압축해제 설치 검증: `public/downloads/freecanvas-ai-helper` 폴더를 chrome://extensions 에 로드 → ID 가 `hlhgommjiblanfmcnbhecfmigjopjffd` 인지 확인 → 아이콘 → 「답변서랍 열기」 → 「Google로 로그인」 → 웹과 동일 데이터.

## 구조

- `hooks/use-drawer.ts` — 데이터 흐름 단일 진입점. 로그아웃=로컬 모드(localStorage/chrome.storage), 로그인=클라우드 모드. 자기 쓰기 echo 방지: pending 쓰기 동안 온 스냅샷은 마지막 것만 보관했다가 쓰기 완료 후 적용. 멀티탭 캐시에서 로그인 직후 탭 간 인증 어긋남으로 나는 permission-denied 는 최대 3회 재구독.
- `lib/cloud-model.ts` — 순수 로직(firebase import 없음, 테스트 대상): 문서→상태 변환, order 배정(앞 끼움 min-1 / 뒤 붙임 max+1), diff 계산, 최초 동기화 계획(`planFirstSync`).
- `lib/cloud.ts` — Firestore 구독/배치 쓰기(400개 단위)/트랜잭션 초기화. `lib/firebase.ts` — 초기화(멀티탭 영속 캐시, 에뮬레이터 스위치). `lib/auth.ts` — 웹 팝업(막히면 리디렉션), 확장 offscreen 경로.
- `app/auth-page.ts` + `auth.html` — 확장 로그인 도우미(허용 origin: 프리캔버스 확장 ID 하나). `extension/offscreen.ts` — 확장 offscreen 문서(빌드 시 `offscreen.js`).
- `components/account.tsx` — 사이드바 계정 카드, 계정 다이얼로그(사이드패널·모바일), 로그인 배너, 동기화 배지. `app/account.css`.
- `lib/extension-id.ts` — 프리캔버스 확장 ID·공개키·URL 상수. 공개키는 웹스토어 CRX 헤더에서 추출한 개발자 키(테스트가 ID 일치 검증).
- `scripts/package-app.mjs`(빌드: dist + release/answer-drawer 패널 폴더), `scripts/sync-freecanvas-extension.mjs`(marketgen-ai 두 폴더로 복사), `scripts/dev-emulator.mjs`.
- `emulator/firestore.rules` + `firebase.emulator.json` + `tests/rules.test.mjs` — 규칙 테스트(에뮬레이터 필요, firebase-tools 15 는 JDK 21 필요 — 이 PC 는 JDK 17 뿐이라 검증 때 임시 JRE 21 을 scratchpad 에 받아 JAVA_HOME 으로 지정했다).

## Firestore 데이터 모양

```
answerDrawer/{uid}                    { initializedAt, updatedAt, migrationVersion:1, source:'web'|'extension' }
answerDrawer/{uid}/stores/{storeId}   { name, channel, address, exchangeFee, returnFee, shipping, returns, size, order, updatedAt }
answerDrawer/{uid}/replies/{replyId}  { title, category, body, favorite, order, updatedAt }
```

배열 순서는 `order` 오름차순(동률은 id). 전체 백업 가져오기/복원은 diff 로 필요한 set/delete 만 배치 쓰기.

## 조율 주의사항

- **marketgen-ai 는 Codex 와 동시 작업 중 — 이미 일부가 푸시됐다.** 2026-09-18 작업 도중 Codex 커밋 `80543e9`(엑셀 대량 생성)가 `git add -A` 로 내 작업 중 파일(manifest 0.3.0+key, background/popup 변경, `firestore.rules` answerDrawer 블록, 1차 빌드의 `answer-drawer/` 폴더, ZIP)을 함께 담아 origin/main 에 푸시했고 freecanvas Pages 배포도 성공했다. 즉 **freecanvas.ai.kr 다운로드 ZIP 은 이미 0.3.0(1차 패널 빌드)** 이다. 그러나 (a) Firestore 규칙은 아직 미배포로 추정(Codex HANDOFF "미배포"), (b) answer-drawer 웹(`auth.html`)이 미배포라 그 ZIP 으로 사이드패널 로그인을 누르면 실패한다. 상품 가져오기 기능은 영향 없음. 최종 빌드(멀티탭 재구독 수정 포함)와 확장 README 는 내 로컬 커밋 `f1f216e` 에만 있다 → 아래 배포 절차 1·3·4 를 빨리 진행하거나, 원치 않으면 marketgen-ai 에서 확장 변경을 되돌려야 한다.
- 확장의 `answer-drawer/` 폴더는 빌드 산출물이다. 직접 고치지 말고 answer-drawer 에서 `npm run build && npm run sync:freecanvas` 로 갱신한다. 소스 폴더와 미러 폴더는 항상 둘 다.
- 로그인 도우미는 확장 ID 하나만 허용한다. 프리캔버스 확장의 `key` 를 바꾸거나 다른 확장에서 쓰려면 `lib/extension-id.ts` 와 `auth.html` 을 다시 배포해야 한다.
- 이 저장소에서 `firebase deploy` 금지(프로젝트 규칙 전체가 answerDrawer 블록으로 덮여 프리캔버스가 깨진다). `firebase.emulator.json` 은 에뮬레이터 전용.

## 남은 일 / 후보

- 배포(위 절차) 및 실제 Chrome 확장 클릭 검증.
- 내장 브라우저 검증 편의로 에뮬레이터 모드에서는 리디렉션 로그인을 쓴다(`useEmulator` 분기) — 운영에는 영향 없음.
- 사이드패널 `index.html`(옵션 페이지 용도였던 것)은 확장 폴더에 복사하지 않는다. 브랜드 로고 클릭은 확장에서 웹사이트를 새 탭으로 연다.
- 개선 후보: 오프라인 상태에서 만든 변경의 건수 표시, 계정 삭제(데이터 삭제) 메뉴, 확장 컨텍스트 메뉴로 사이드패널 열기(`contextMenus` 권한 추가 시 재심사).
