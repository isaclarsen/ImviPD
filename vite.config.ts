import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Relative asset paths make GitHub Pages subpath hosting robust.
  base: "./"
});
