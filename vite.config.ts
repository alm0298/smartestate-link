import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Custom logging plugin
const loggingPlugin = () => ({
  name: 'logging-plugin',
  configureServer(server: any) {
    server.middlewares.use((req: any, res: any, next: any) => {
      const originalWrite = res.write;
      const originalEnd = res.end;

      const logMessage = (chunk: any) => {
        if (typeof chunk === 'string' || Buffer.isBuffer(chunk)) {
          const str = chunk.toString();
          if (
            str.includes('console.log') ||
            str.includes('console.error') ||
            str.includes('console.info')
          ) {
            console.log('\n[Client Log]:', str);
          }
        }
      };

      res.write = function (chunk: any, ...args: any[]) {
        logMessage(chunk);
        return originalWrite.apply(res, [chunk, ...args] as any);
      };

      res.end = function (chunk: any, ...args: any[]) {
        if (chunk) logMessage(chunk);
        return originalEnd.apply(res, [chunk, ...args] as any);
      };

      next();
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), loggingPlugin()],
  base: '/smartestate-link/',
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    sourcemap: true,
    minify: 'esbuild',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        standalone: path.resolve(__dirname, 'standalone.html'),
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },
  logLevel: 'info',
  optimizeDeps: {
    include: ['react', 'react-dom']
  },
  define: {
    'process.env': {}
  },
});
