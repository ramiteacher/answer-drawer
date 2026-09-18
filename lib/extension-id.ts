// 답변서랍 사이드패널은 별도 확장이 아니라 「프리캔버스AI 보조」 확장(marketgen-ai 저장소
// chrome-extension/marketgen-smartstore) 안에 answer-drawer/ 폴더로 들어간다.
// 확장 ID는 그 확장 manifest.json 의 "key"(Chrome 웹스토어 개발자 공개키)로 고정되어
// 웹스토어 설치본과 ZIP 압축해제 설치본이 같은 ID를 가진다. 로그인 도우미(auth.html)는
// 이 ID 의 origin 에서 온 요청에만 응답한다. tests/core.test.mjs 가 key ↔ ID 일치를 검증한다.
export const EXTENSION_ID = "hlhgommjiblanfmcnbhecfmigjopjffd";
// manifest.json "key" 값 (Chrome 웹스토어 항목의 개발자 공개키 — 웹스토어 CRX 헤더에서 추출)
export const EXTENSION_PUBLIC_KEY = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtlkLcBKTWtDg2l3rYK6RpaHqzN5s3eph1yV/qa9Zoj6xRfNkAtmv6JPR3kBk/qwqHeTyN3bv+0p9l1UbCxh0vtMH/ShE6nWrqZhBTGEsSn3P1dOdbW3Rq/5hE3Q0/DVqy8forut/2FqNe5huMHd1AhnG4/iPbkNaVX90Zh9jBd8G0T98YzOlzE5+sPg24chrw76owUYL2r5KL7fJQP4ZqKlVX158Q6lzO3yJ9WpeuHxVteKV4Er6fQBgDRsQ8o0XCdAb8sP39J/QrFruGh41CnHdDZxPjm1xrszDWPjEZStoMXP3Zi8BKcZxtrRavwrZNG657cizzc9BWhhlnTxSuwIDAQAB";
export const EXTENSION_ORIGIN = `chrome-extension://${EXTENSION_ID}`;
export const EXTENSION_STORE_URL = `https://chromewebstore.google.com/detail/${EXTENSION_ID}`;
export const EXTENSION_NAME = "프리캔버스AI 보조";
// 확장 안에서 답변서랍 파일이 놓이는 하위 폴더 (sidepanel.html, offscreen.html, assets/)
export const PANEL_DIR = "answer-drawer";

export const WEB_ORIGIN = "https://ramiteacher.github.io";
export const WEB_BASE_PATH = "/answer-drawer/";
export const WEB_URL = `${WEB_ORIGIN}${WEB_BASE_PATH}`;
// 확장프로그램 로그인 도우미 페이지 — offscreen 문서 안의 iframe 으로 열린다.
export const AUTH_HELPER_URL = `${WEB_URL}auth.html`;
