import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/three/")) return "three";
          if (id.includes("/react/") || id.includes("/react-dom/"))
            return "react";
        },
      },
    },
  },
  server: {
    proxy: {
      "/sim_trace.json": {
        target: "http://127.0.0.1:8765",
        changeOrigin: true,
      },
      "/step": {
        target: "http://127.0.0.1:8766",
        changeOrigin: true,
      },
    },
  },
});
