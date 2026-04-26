var _a;
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
var basePath = (_a = process.env.BASE_PATH) !== null && _a !== void 0 ? _a : '/';
var normalizedBasePath = basePath.endsWith('/') ? basePath : "".concat(basePath, "/");
export default defineConfig({
    base: normalizedBasePath,
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['pwa-192.png', 'pwa-512.png'],
            manifest: {
                name: 'Münzwurf',
                short_name: 'Münzwurf',
                description: 'Simulation zum Gesetz der großen Zahlen beim Münzwurf.',
                id: normalizedBasePath,
                start_url: normalizedBasePath,
                scope: normalizedBasePath,
                display: 'standalone',
                background_color: '#182b48',
                theme_color: '#5f49da',
                lang: 'de',
                icons: [
                    {
                        src: 'pwa-192.png',
                        sizes: '192x192',
                        type: 'image/png',
                    },
                    {
                        src: 'pwa-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                    },
                    {
                        src: 'pwa-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable',
                    },
                ],
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest}'],
            },
        }),
    ],
});
