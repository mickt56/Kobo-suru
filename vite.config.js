import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // One ~600 KB bundle (mostly the chart library) is fine for a local tool; don't warn about it.
  build: { chunkSizeWarningLimit: 1000 },
});
