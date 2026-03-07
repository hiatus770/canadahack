import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        host: true,
        proxy: {
            "/api": {
                target: "http://localhost:8081",
                configure: (proxy) => {
                    proxy.on('proxyReq', (proxyReq, req) => {
                        const clientIP = req.socket.remoteAddress;
                        if (clientIP) {
                            proxyReq.setHeader('X-Forwarded-For', clientIP);
                        }
                    });
                },
            },
        },
        allowedHosts: ['localhost', '127.0.0.1', '100.113.170.49', 'insp', '100.64.184.29', 'anastasiyas-macbook-air', '100.121.126.78', 'rosie-zenbook'],
    },
});
