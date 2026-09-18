import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
// 두 진입점: index.html(답변서랍) · auth.html(프리캔버스AI 보조 확장의 로그인 도우미)
export default defineConfig({base:"./",plugins:[react()],resolve:{alias:{"@":fileURLToPath(new URL(".",import.meta.url))}},css:{postcss:{plugins:[]}},server:{host:"127.0.0.1",port:5180,strictPort:true},build:{outDir:"dist",emptyOutDir:true,rollupOptions:{input:{main:fileURLToPath(new URL("./index.html",import.meta.url)),auth:fileURLToPath(new URL("./auth.html",import.meta.url))}}}});
