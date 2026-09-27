import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// base: "./" にすると、ビルド結果をどのパスに置いても(GitHub Pages など)読み込める
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "./",
});
