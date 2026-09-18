# 답변서랍

스마트스토어·쿠팡 셀러를 위한 고객 문의 답변 관리 도구입니다. GitHub Pages 웹사이트(https://ramiteacher.github.io/answer-drawer/)와 「프리캔버스AI 보조」 Chrome 확장프로그램의 사이드패널을 같은 소스로 제공하며, Google 계정으로 로그인하면 둘이 같은 답변을 자동으로 주고받습니다.

## 할 수 있는 일

- 배송·교환/반품·상품·기타 문의 답변 저장, 편집, 삭제
- 검색과 즐겨찾기로 답변 찾기
- 여러 스토어의 출고 안내, 반품 주소, 배송비, 접수 방법 관리
- `{스토어명}`, `{출고 안내}`, `{반품 주소}`, `{교환 배송비}`, `{반품 배송비}`, `{접수 방법}`, `{사이즈 안내}` 자동 입력
- 발송할 문구만 임시로 수정하고 복사. 미입력 항목이 남으면 복사를 차단합니다.
- Google 로그인 → 웹과 확장프로그램 사이드패널이 같은 답변을 실시간으로 동기화
- JSON 백업 내보내기·가져오기, 이전 백업 복원
- 단축키 `/`로 검색, `Ctrl+Enter` 또는 `Cmd+Enter`로 복사

## 저장 방식

- **로그인 전**: 웹은 현재 브라우저의 localStorage, 확장은 chrome.storage.local 에 저장합니다. 기기·브라우저 사이에 동기화되지 않습니다.
- **로그인 후**: Google 계정(Firebase Authentication)으로 로그인하면 답변이 Cloud Firestore 의 `answerDrawer/{uid}` 아래에 저장되고, 웹·확장 어디서 추가·수정·삭제하든 상대편에 자동으로 반영됩니다. Firebase 프로젝트는 프리캔버스AI(marketgen-ai-87525)를 함께 쓰므로 프리캔버스와 같은 Google 계정입니다.
- **최초 로그인 시 이전**: 이 브라우저에 있던 답변은 계정에 아직 데이터가 없을 때 계정으로 옮겨집니다(한 계정에만). 계정에 이미 답변이 있으면 계정 것을 불러오고, 브라우저에 있던 답변은 「이전 백업」으로 보관합니다.
- **계정 전환·로그아웃**: 다른 계정으로 로그인하면 그 계정의 답변만 보이고, 로그아웃하면 계정 답변은 화면에서 사라지고 다시 브라우저 저장 모드가 됩니다.
- **오프라인**: 연결이 끊기면 「오프라인」으로 표시되고, 그동안의 수정은 연결이 돌아오면 자동으로 올라갑니다. 권한 등으로 저장에 실패하면 「동기화 오류」와 함께 다시 시도할 수 있습니다.

초기 스토어명은 `내 스토어`이며 주소·배송비는 비어 있습니다. 실제 정책에 맞게 먼저 설정하세요. 기본 답변 역시 판매 정책과 고객 문의에 맞게 검토한 뒤 사용하세요.

## 확장프로그램에서 쓰기

별도 확장이 아니라 Chrome 웹스토어의 **프리캔버스AI 보조**(ID `hlhgommjiblanfmcnbhecfmigjopjffd`) 안에 들어 있습니다.

1. Chrome 웹스토어에서 프리캔버스AI 보조를 설치합니다(또는 프리캔버스가 제공하는 ZIP 을 압축 해제해 `chrome://extensions` 개발자 모드에서 로드).
2. 툴바 아이콘을 누르고 **답변서랍 열기**를 선택하면 사이드패널이 열립니다.
3. 사이드패널에서 **Google로 로그인**을 누릅니다. 웹과 같은 계정이면 답변이 그대로 보입니다.

확장은 셀러 페이지를 읽거나 답변을 자동 발송하지 않습니다. 사용자가 복사한 문구를 문의창에 붙여 넣어 전송합니다.

## 개발과 검증

Node.js 22.13 이상. Firebase 설정값은 `.env.example` 을 복사한 `.env.local` 에 넣습니다(프리캔버스 프로젝트의 공개 웹 설정값).

```sh
npm ci
npm run dev:pages      # http://127.0.0.1:5180 (실제 Firebase 프로젝트)
npm run typecheck
npm test               # 순수 로직·offscreen 메시지 검증 (Firebase 불필요)
npm run build
```

로컬 에뮬레이터로 로그인·동기화·규칙을 검증하려면(firebase-tools CLI 와 JDK 21 이상 필요):

```sh
npm run emulators      # Auth 9099 · Firestore 8080 (demo-answer-drawer)
node scripts/dev-emulator.mjs   # VITE_FIREBASE_EMULATOR=1 로 개발 서버 — 반드시 http://127.0.0.1:5180 로 연다
npm run test:rules     # emulator/firestore.rules 규칙 테스트
```

`npm run build` 결과:

- `dist/`: GitHub Pages 정적 사이트 (`index.html` 답변서랍 + `auth.html` 확장 로그인 도우미)
- `release/answer-drawer/`: 프리캔버스AI 보조 확장에 넣는 사이드패널 폴더 (`sidepanel.html`, `offscreen.html`, `offscreen.js`, `assets/`)
- `release/answer-drawer-panel.zip`, `release/answer-drawer-github-pages.zip`

사이드패널 폴더를 프리캔버스 확장(marketgen-ai 저장소)에 복사하려면 `npm run sync:freecanvas -- <marketgen-ai 경로>` 를 실행합니다. 소스 폴더와 배포 미러 폴더 둘 다에 `answer-drawer/` 로 복사되며, 그 뒤 marketgen-ai 에서 확장 버전을 올리고 `npm run package:smartstore-extension` 으로 ZIP 을 다시 만듭니다.

## 확장 로그인 구조

Manifest V3 확장에서는 `signInWithPopup` 을 바로 쓸 수 없어 Firebase 가 안내하는 offscreen 문서 방식을 씁니다.

1. 사이드패널이 백그라운드에 `answer-drawer-auth-open` 을 보내면 `answer-drawer/offscreen.html` 이 만들어집니다.
2. offscreen 문서는 웹의 `auth.html` 을 iframe 으로 열고, 사이드패널의 `answer-drawer-auth-run` 요청을 받아 iframe 에 `answer-drawer-init-auth` 를 보냅니다.
3. `auth.html` 은 요청 origin 이 프리캔버스AI 보조 확장(`chrome-extension://hlhgommjiblanfmcnbhecfmigjopjffd`)일 때만 Google 팝업 로그인을 진행하고 OAuth 자격 증명(idToken/accessToken)만 돌려줍니다.
4. 사이드패널이 `signInWithCredential` 로 로그인을 끝냅니다. 토큰은 저장소에 복사하지 않고 Firebase Auth 의 기본 persistence 에 맡깁니다.

확장 ID 는 확장 manifest 의 `key`(웹스토어 개발자 공개키)로 고정됩니다. 키를 바꾸면 `lib/extension-id.ts` 도 함께 바꿔야 하며, 테스트가 둘의 일치를 검증합니다.

## Firestore 규칙

배포 규칙은 marketgen-ai 저장소의 `firestore.rules` 에 `answerDrawer` 블록으로 병합되어 그쪽에서 배포합니다(프로젝트가 프리캔버스·매칭체커와 공유됨). 이 저장소의 `emulator/firestore.rules` 는 같은 블록의 에뮬레이터·테스트용 사본이며, 이 저장소에서 `firebase deploy` 를 실행하면 안 됩니다. 규칙은 본인 UID 아래 문서만 읽고 쓸 수 있게 하고, 허용 필드·타입·길이를 검사합니다.

## GitHub Pages 배포

`main` 에 푸시하면 `.github/workflows/pages.yml` 이 typecheck → test → build → Pages 배포를 수행합니다. 빌드에는 저장소 secrets `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` 가 필요하며, 없으면 빌드가 실패합니다. Firebase Authentication 승인 도메인에 `ramiteacher.github.io` 가 있어야 합니다(등록됨).

## 권한과 개인정보

- 웹: Google 계정 이메일·이름·프로필 사진을 로그인 표시에만 사용합니다. 답변 데이터는 본인 UID 아래에만 저장됩니다.
- 확장(프리캔버스AI 보조): `sidePanel`(답변서랍 표시), `offscreen`(로그인 도우미 로드). 셀러 플랫폼 로그인 정보, 고객 문의 내용, 주문 자료는 수집하지 않습니다.
- 데이터 분석·광고·원격 로깅 SDK 를 포함하지 않습니다.
