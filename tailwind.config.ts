import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#101426",
        mist: "#eef4ff",
        cyan: "#08a4bd",
        ember: "#ff8a47",
        leaf: "#3f8f67"
      },
      boxShadow: {
        card: "0 24px 65px rgba(16, 20, 38, 0.18)"
      }
    }
  },
  plugins: []
} satisfies Config;
