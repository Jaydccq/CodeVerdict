import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { compression } from 'vite-plugin-compression2';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiProxyTarget =
    env.VITE_API_PROXY_TARGET ?? 'http://127.0.0.1:3001';

  return {
    plugins: [
      vue(),
      compression({
        algorithms: ['brotliCompress'],
        exclude: /\.(png|jpe?g|gif|webp|svg|woff2?)$/,
      }),
    ],
    build: {
      // Monaco editor core is ~3.6 MB - unavoidable for a self-hosted code editor
      chunkSizeWarningLimit: 4000,
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
