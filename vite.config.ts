import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // Sentry source map upload — only in production builds
    mode === "production" && process.env.SENTRY_AUTH_TOKEN && sentryVitePlugin({
      org: process.env.SENTRY_ORG || "chv-riskinsight",
      project: process.env.SENTRY_PROJECT || "react-app",
      authToken: process.env.SENTRY_AUTH_TOKEN,
      sourcemaps: {
        filesToDeleteAfterUpload: ["./dist/**/*.map"],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: "hidden",
    // Límite aumentado a 1 MB para chunks grandes inevitables (exceljs ~1.2 MB)
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
        // Chunk splitting — evitar separar librerías que dependen entre sí
        manualChunks(id) {
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/") || id.includes("node_modules/react-router/") || id.includes("node_modules/scheduler/")) {
            return "vendor-react";
          }
          if (id.includes("node_modules/recharts/") || id.includes("node_modules/d3-") || id.includes("node_modules/victory-")) {
            return "vendor-charts";
          }
          // Export libraries juntos (exceljs + jspdf — evita circular deps)
          if (id.includes("node_modules/exceljs/") || id.includes("node_modules/jspdf/") || id.includes("node_modules/html2canvas/") || id.includes("node_modules/jspdf-autotable/")) {
            return "vendor-export";
          }
          if (id.includes("node_modules/date-fns/") || id.includes("node_modules/luxon/") || id.includes("node_modules/dayjs/")) {
            return "vendor-dates";
          }
          if (id.includes("node_modules/@sentry/")) {
            return "vendor-sentry";
          }
          if (id.includes("node_modules/@supabase/")) {
            return "vendor-supabase";
          }
          if (id.includes("node_modules/@tanstack/")) {
            return "vendor-query";
          }
          if (id.includes("node_modules/@radix-ui/")) {
            return "vendor-radix";
          }
          if (id.includes("node_modules/lucide-") || id.includes("node_modules/embla-") || id.includes("node_modules/vaul/") || id.includes("node_modules/cmdk/") || id.includes("node_modules/sonner/") || id.includes("node_modules/input-otp/")) {
            return "vendor-ui";
          }
          if (id.includes("node_modules/")) {
            return "vendor-other";
          }
        },
      },
    },
  },
  css: {
    devSourcemap: mode === "development",
  },
}));
// Force reload cache

