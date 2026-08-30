/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import child_process from 'node:child_process';
import { env } from 'node:process';
import { defineConfig, type ServerOptions } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * The Visual Studio SPA template proxies the dev server to the ASP.NET Core host over
 * HTTPS. The dev certificate is only required when actually serving; `vite build` must
 * never depend on it (CI machines have no dev-certs).
 */
function resolveDevHttps(): ServerOptions['https'] {
    const baseFolder =
        env.APPDATA !== undefined && env.APPDATA !== ''
            ? `${env.APPDATA}/ASP.NET/https`
            : `${env.HOME}/.aspnet/https`;

    const certificateName = 'kellumssecondchance.client';
    const certFilePath = path.join(baseFolder, `${certificateName}.pem`);
    const keyFilePath = path.join(baseFolder, `${certificateName}.key`);

    if (!fs.existsSync(baseFolder)) {
        fs.mkdirSync(baseFolder, { recursive: true });
    }

    if (!fs.existsSync(certFilePath) || !fs.existsSync(keyFilePath)) {
        const result = child_process.spawnSync(
            'dotnet',
            ['dev-certs', 'https', '--export-path', certFilePath, '--format', 'Pem', '--no-password'],
            { stdio: 'inherit' },
        );
        if (result.status !== 0) {
            return undefined;
        }
    }

    return {
        key: fs.readFileSync(keyFilePath),
        cert: fs.readFileSync(certFilePath),
    };
}

const target = env.ASPNETCORE_HTTPS_PORT
    ? `https://localhost:${env.ASPNETCORE_HTTPS_PORT}`
    : env.ASPNETCORE_URLS
        ? env.ASPNETCORE_URLS.split(';')[0]
        : 'https://localhost:7170';

// Vitest loads this config with command === 'serve'; test runs must not need
// a dev certificate.
const isTestRun = Boolean(env.VITEST);

export default defineConfig(({ command }) => ({
    plugins: [react()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    build: {
        target: 'es2022',
        cssTarget: 'chrome111',
        sourcemap: false,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (!id.includes('node_modules')) return undefined;
                    if (id.includes('react-router')) return 'router';
                    if (id.includes('lucide-react')) return 'icons';
                    if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('scheduler')) {
                        return 'react';
                    }
                    return undefined;
                },
            },
        },
    },
    server:
        command === 'serve' && !isTestRun
            ? {
                proxy: {
                    '^/api': { target, secure: false, changeOrigin: true },
                },
                port: Number.parseInt(env.DEV_SERVER_PORT || '50828', 10),
                https: resolveDevHttps(),
            }
            : undefined,
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        css: true,
        include: ['src/**/*.{test,spec}.{ts,tsx}'],
        restoreMocks: true,
    },
}));
