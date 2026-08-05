import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      // Large readers/charts remain route-lazy. Common dependencies are split
      // into stable cacheable chunks so the initial app bundle stays small.
      // The 750 kB ceiling accommodates the isolated EPUB engine without
      // hiding accidental growth in the main application bundle.
      chunkSizeWarningLimit: 750,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (!id.includes('node_modules')) return undefined;
            if (/node_modules\/(react|react-dom|react-router|scheduler)\//.test(id)) return 'vendor-react';
            if (/node_modules\/(@base-ui|@radix-ui|lucide-react|sonner|next-themes|clsx|tailwind-merge|class-variance-authority)\//.test(id)) return 'vendor-ui';
            if (id.includes('node_modules/date-fns/')) return 'vendor-date';
            if (/node_modules\/(@hookform|react-hook-form|zod)\//.test(id)) return 'vendor-forms';
            if (/node_modules\/(recharts|d3-|victory-vendor)\//.test(id)) return 'vendor-charts';
            if (id.includes('node_modules/qrcode/')) return 'vendor-qr';
            return undefined;
          },
        },
      },
    },
  };
});
