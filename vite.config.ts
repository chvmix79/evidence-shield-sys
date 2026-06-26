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
    // Aumentamos el límite a 1 MB para chunks grandes inevitables (exceljs ~1.2 MB)
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Content hash based cache busting (standard approach)
        // Hash is based on file content, so unchanged files keep same name
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
        // Manual chunk splitting for optimal caching and load times
        manualChunks(id) {
          // Vendor: React ecosystem (primero para evitar overlap con vendor-other)
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/") || id.includes("node_modules/react-router/") || id.includes("node_modules/scheduler/")) {
            return "vendor-react";
          }
          // Vendor: Charts (recharts is ~366 KB alone)
          if (id.includes("node_modules/recharts/") || id.includes("node_modules/d3-") || id.includes("node_modules/victory-")) {
            return "vendor-charts";
          }
          // Vendor: ExcelJS (1.2 MB — el más pesado, va solo)
          if (id.includes("node_modules/exceljs/")) {
            return "vendor-excel";
          }
          // Vendor: PDF export (jspdf + html2canvas)
          if (id.includes("node_modules/jspdf/") || id.includes("node_modules/html2canvas/") || id.includes("node_modules/jspdf-autotable/")) {
            return "vendor-pdf";
          }
          // Vendor: Date utilities (date-fns locale is ~151 KB)
          if (id.includes("node_modules/date-fns/") || id.includes("node_modules/luxon/") || id.includes("node_modules/dayjs/")) {
            return "vendor-dates";
          }
          // Vendor: Sentry error tracking
          if (id.includes("node_modules/@sentry/")) {
            return "vendor-sentry";
          }
          // Vendor: Supabase
          if (id.includes("node_modules/@supabase/")) {
            return "vendor-supabase";
          }
          // Vendor: React Query
          if (id.includes("node_modules/@tanstack/")) {
            return "vendor-query";
          }
          // Vendor: UI library (Radix UI components)
          if (id.includes("node_modules/@radix-ui/")) {
            return "vendor-radix";
          }
          // Vendor: Other large libraries (lucide, cmdk, etc.)
          if (id.includes("node_modules/lucide-") || id.includes("node_modules/embla-") || id.includes("node_modules/vaul/") || id.includes("node_modules/cmdk/") || id.includes("node_modules/sonner/") || id.includes("node_modules/input-otp/")) {
            return "vendor-ui";
          }
          // Everything else from node_modules goes to vendor bundle
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

