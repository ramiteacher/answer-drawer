import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
export default defineConfig({base:"./",plugins:[react()],resolve:{alias:{"@":fileURLToPath(new URL(".",import.meta.url))}},css:{postcss:{plugins:[]}},server:{host:"127.0.0.1",port:5180,strictPort:true},build:{outDir:"dist",emptyOutDir:true}});
