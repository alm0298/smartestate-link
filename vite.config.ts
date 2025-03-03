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

// Environment variable replacement plugin
const envReplacementPlugin = () => {
  return {
    name: 'env-replacement-plugin',
    transformIndexHtml(html: string) {
      return html.replace(
        /%VITE_GOOGLE_MAPS_API_KEY%/g, 
        process.env.VITE_GOOGLE_MAPS_API_KEY || ''
      );
    }
  };
};

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    loggingPlugin(),
    envReplacementPlugin()
  ],
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
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    }
  },
  logLevel: 'info',
  optimizeDeps: {
    include: ['react', 'react-dom']
  },
  define: {
    // Make env variables available to the client
    'process.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL),
    'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY),
    'process.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(process.env.VITE_GOOGLE_MAPS_API_KEY),
    'process.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL),
  },
});
