var _a;
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
var apiTarget = (_a = process.env.FUNCTION_API_URL) !== null && _a !== void 0 ? _a : 'http://localhost:8080';
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 3000,
        proxy: {
            '/api': {
                target: apiTarget,
                changeOrigin: true,
                ws: true,
                configure: function (proxy, _options) {
                    proxy.on('error', function (err, _req, _res) {
                        console.log('proxy error', err);
                    });
                    proxy.on('proxyReqWs', function (proxyReq, req, socket) {
                        console.log('WebSocket proxy:', req.url);
                    });
                },
            },
        },
    },
    build: {
        outDir: 'dist',
        sourcemap: false,
        // Optimize chunk size
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            output: {
                // Manual chunks for better caching
                manualChunks: {
                    // Core React ecosystem
                    'vendor-react': ['react', 'react-dom', 'react-router-dom'],
                    // Heavy visualization libraries - lazy loaded
                    'vendor-monaco': ['@monaco-editor/react', 'monaco-editor'],
                    'vendor-echarts': ['echarts', 'echarts-for-react'],
                    'vendor-reactflow': ['reactflow'],
                    // UI utilities
                    'vendor-ui': ['lucide-react', 'clsx'],
                },
            },
        },
    },
    // Optimize dependencies
    optimizeDeps: {
        include: ['react', 'react-dom', 'react-router-dom'],
        exclude: ['@monaco-editor/react'],
    },
});
