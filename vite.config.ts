import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const publicSiteUrl = (env.VITE_PUBLIC_SITE_URL || "https://zamaecom.vercel.app").replace(/\/$/, "");

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: "zama-public-url",
        transformIndexHtml(html) {
          return html.replaceAll("__PUBLIC_SITE_URL__", publicSiteUrl);
        },
      },
    ],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              { name: "tanstack", test: /node_modules\/@tanstack\// },
            ],
          },
        },
      },
    },
  };
});
