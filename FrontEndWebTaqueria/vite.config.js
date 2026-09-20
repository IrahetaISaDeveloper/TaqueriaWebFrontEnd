import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// A qué backend habla el frontend en desarrollo cuando VITE_API_URL no está
// definida (el .env de este proyecto suele venir vacío). Se deja como una
// sola constante porque src/context/socketContext.jsx necesita EXACTAMENTE
// este mismo destino: si el proxy de /api y el socket apuntaran a servidores
// distintos, las peticiones REST y el tiempo real quedarían desincronizados
// (ej. verías los pedidos de un backend pero las notificaciones de otro).
//
// El backend local (SYSCOR-backEnd, puerto 4000 por defecto) es el destino
// correcto para desarrollo: es lo que corre en la máquina de quien está
// programando, y usar Render aquí escondería endpoints nuevos que todavía no
// se han desplegado (como pasó con /users/payroll: existía en local pero no
// en producción, y el 404 confundía). Si Render llegara a ser lo que se
// quiere probar en local, basta con definir VITE_API_URL en el .env.
const DEFAULT_BACKEND_URL = 'http://localhost:4000';

export default defineConfig(({ mode }) => {
  // Carga el .env de la raíz del proyecto (incluida VITE_API_URL si la
  // definieras ahí) para poder usarla también aquí, no solo en el código de
  // React vía import.meta.env. "." equivale a process.cwd() cuando Vite
  // corre desde la raíz del proyecto (caso normal de `npm run dev`/`build`).
  const env = loadEnv(mode, '.', '');
  const backendTarget = env.VITE_API_URL
    ? env.VITE_API_URL.replace(/\/api\/?$/, '')
    : DEFAULT_BACKEND_URL;

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              // Pasar las cookies del navegador al backend
              if (req.headers.cookie) {
                proxyReq.setHeader('cookie', req.headers.cookie);
              }
            });
          }
        },
        // Socket.IO no pasa por axios/fetch, así que no comparte el proxy de
        // '/api' de forma automática: sin esta entrada, io('/‍') en el
        // navegador intentaría conectar contra el propio Vite (5173) en vez
        // del backend real, y el handshake nunca llegaría a socket.js.
        // "ws: true" habilita el upgrade a WebSocket a través del proxy.
        '/socket.io': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      }
    }
  }
})