# 답변서랍

스마트스토어·쿠팡 셀러를 위한 고객 문의 답변 관리 도구입니다. GitHub Pages 웹사이트와 Chrome Manifest V3 확장프로그램을 같은 소스로 제공합니다.

## 할 수 있는 일

- 배송·교환/반품·상품·기타 문의 답변 저장, 편집, 삭제
- 검색과 즐겨찾기로 답변 찾기
- 여러 스토어의 출고 안내, 반품 주소, 배송비, 접수 방법 관리
- `{스토어명}`, `{출고 안내}`, `{반품 주소}`, `{교환 배송비}`, `{반품 배송비}`, `{접수 방법}`, `{사이즈 안내}` 자동 입력
- 발송할 문구만 임시로 수정하고 복사. 미입력 항목이 남으면 복사를 차단합니다.
- JSON 백업 내보내기·가져오기, 이전 백업 복원
- 웹에서 확장프로그램으로 답변 스냅샷 전송
- 단축키 `/`로 검색, `Ctrl+Enter` 또는 `Cmd+Enter`로 복사

## 저장 방식

웹사이트는 현재 브라우저의 localStorage, 확장프로그램은 chrome.storage.local에 저장합니다. 서버, 로그인, 결제, AI API는 필요하지 않습니다. 브라우저나 기기 사이에 자동으로 동기화되지 않습니다. 브라우저 저장 데이터를 지우거나 확장프로그램을 삭제하기 전에 JSON 백업을 보관하세요.

웹에서 **확장프로그램 · 백업 → 확장프로그램으로 보내기**를 누르면 현재 웹의 내용을 확장프로그램으로 복사합니다. 자동 양방향 동기화가 아닙니다. 확장프로그램에서 수정한 내용을 웹으로 옮기려면 확장프로그램에서 JSON을 내보내고 웹에서 가져오세요. 전송·가져오기·답변 삭제 전 내용은 이전 백업으로 보관됩니다.

초기 스토어명은 `내 스토어`이며 주소·배송비는 비어 있습니다. 실제 정책에 맞게 먼저 설정하세요. 기본 답변 역시 판매 정책과 고객 문의에 맞게 검토한 뒤 사용하세요.

## 바로 설치하기

1. `answer-drawer-extension.zip`을 원하는 폴더에 압축 해제합니다.
2. Chrome 주소창에 `chrome://extensions`를 입력합니다.
3. **개발자 모드**를 켭니다.
4. **압축해제된 확장 프로그램을 로드합니다**를 누르고 `manifest.json`이 있는 폴더를 선택합니다.
5. 도구 모음에서 답변서랍 아이콘을 클릭하면 사이드 패널이 열립니다.
6. 처음에는 **스토어 설정**에서 스토어명과 안내를 입력하세요.

Chrome 116 이상을 대상으로 합니다. Chrome 웹 스토어에 등록한 버전은 아니며, 수동 설치 패키지입니다. 확장프로그램은 셀러 페이지를 읽거나 답변을 자동 발송하지 않습니다. 사용자가 복사한 문구를 문의창에 붙여 넣어 전송합니다.

## GitHub Pages 배포

배포 대상은 `ramiteacher/answer-drawer`입니다. 현재 산출물에는 코드와 배포 설정이 준비되어 있으며, 실제 저장소 생성 및 Pages 배포 완료 여부는 별도로 확인해야 합니다.

### 소스에서 배포

1. GitHub에 새 공개 저장소 `answer-drawer`를 만듭니다.
2. 이 프로젝트 파일을 저장소의 `main` 브랜치에 업로드합니다. `node_modules`, `.test-build`, `release`는 업로드하지 않습니다.
3. 저장소 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 선택합니다.
4. **Actions → Deploy answer-drawer → Run workflow**를 실행합니다. 이후 `main`에 변경 사항을 올리면 자동으로 배포합니다.
5. 성공하면 GitHub Actions에 표시되는 실제 Pages 주소를 엽니다.

확장프로그램 연결 주소는 `https://ramiteacher.github.io/answer-drawer/`로 설정되어 있습니다. 다른 계정·저장소·도메인을 사용한다면 `extension/manifest.json`의 `content_scripts.matches`, `extension/bridge.ts`의 정확한 origin/path 검사, `components/drawer-dialogs.tsx`의 웹사이트 링크를 함께 변경한 다음 다시 빌드하세요.

### 빌드 없이 배포

`answer-drawer-github-pages.zip`의 내용을 새 저장소 루트에 업로드한 다음 **Settings → Pages → Deploy from a branch → main / (root)**를 선택합니다. 이 ZIP에는 확장프로그램 다운로드 파일도 포함되어 있습니다. 소스 편집·자동 빌드가 필요하면 위 방법을 사용하세요.

## 개발과 검증

Node.js 22.13 이상을 권장합니다.

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run build
```

`npm run build` 결과:

- `dist/`: GitHub Pages 정적 사이트
- `release/extension/`: Chrome에 로드할 폴더
- `release/answer-drawer-extension.zip`: 확장프로그램 설치 패키지
- `release/answer-drawer-github-pages.zip`: 빌드된 정적 사이트

웹사이트와 확장프로그램 모두 외부 실행 코드·외부 폰트에 의존하지 않습니다. Pages의 저장소 하위 경로에서 작동하도록 상대 경로로 빌드합니다.

## 권한과 개인정보

- `storage`: 사용자의 답변과 스토어 정보 저장
- `sidePanel`: 문의 페이지 옆에 답변서랍 표시
- `clipboardWrite`: 사용자가 누른 답변 복사 버튼 처리
- content script: 정확한 관리 페이지 경로에서 사용자가 실행한 답변 전송만 수신

셀러 플랫폼 로그인 정보, 고객 문의 내용, 주문 자료는 수집하지 않습니다. 웹 데이터는 브라우저에 보관하며 GitHub 저장소로 전송하지 않습니다. 데이터 분석·광고·원격 로깅 SDK를 포함하지 않습니다.

## 검증 범위

TypeScript 검사, 프로덕션 빌드, 변수 치환, 백업 유효성, 브라우저/확장 저장 어댑터, 연결 메시지의 출처·형식 검증을 수행했습니다. 실제 Chrome 설치와 브라우저 화면 클릭 검증은 별도 확인이 필요합니다.
