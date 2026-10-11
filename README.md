# SYSCOR — Frontend web

Workspace de npm con los frontends web de SYSCOR para Taquería El Corral. Los tres proyectos consumen el mismo backend (SYSCOR-backEnd) y comparten sistema de diseño, componentes base y configuración a través de un paquete interno.

| Carpeta | Paquete | Qué es | Puerto en desarrollo |
|---|---|---|---|
| `SYSCOR-AdminSystem/` | `@syscor/web-admin` | Panel de administración (antes `FrontEndWebTaqueria`) | 5173 |
| `SYSCOR-kitchenSystem/` | `@syscor/web-kitchen` | Sistema de cocina (KDS) con Chef Panchita por voz | 5174 |
| `SYSCOR-cashierSystem/` | `@syscor/web-cashier` | Sistema de caja (POS): cobros, comprobantes y cortes | 5175 |
| `packages/web-shared/` | `@syscor/web-shared` | Tokens de diseño, assets de marca, componentes, contextos y config de Vite compartidos | — |

Es el mismo patrón que la app móvil (SYSCOR-APP con `@syscor/shared`): lo compartido se importa por su ruta dentro del paquete, por ejemplo `@syscor/web-shared/src/components/FAIcon`.

## Comandos

Todo se corre desde esta carpeta:

```bash
npm install       # instala todo el workspace (un solo node_modules y un solo package-lock.json)
npm run admin     # panel de administración
npm run kitchen   # pantalla de cocina
npm run cashier   # caja (POS)
npm run build     # compila los tres
npm run lint      # lint de los tres
```

Los tres proyectos esperan el backend en `http://localhost:4000` durante el desarrollo (ver `packages/web-shared/vite/createViteConfig.js`), o `VITE_API_URL` en su `.env`.

## Qué va en el paquete compartido

Solo lo que usa más de un proyecto: `styles/tokens.css` (colores, tipografía, modo oscuro), `public/` (logos, fondos, favicon), `FAIcon`, `Logo`, `FormModal`/`ConfirmModal`, `ToastProvider`, `PrimaryButton`, `LoadingSpinner`, `PanchitaIcon`, `ThemeToggle`, los contextos de tema/sesión/socket, `useLogin`/`useLogout`/`useSocket`, `socketEvents`, `orderCode` y `cashierDocuments` (comprobante y corte de caja imprimibles, que usan la caja y el panel). Lo que solo usa uno de los proyectos se queda en su carpeta.

## Despliegue

Cada proyecto es un proyecto de Vercel aparte, con **Root Directory** en su carpeta (`SYSCOR-AdminSystem`, `SYSCOR-kitchenSystem` o `SYSCOR-cashierSystem`). En el panel, `VITE_KITCHEN_URL` y `VITE_CASHIER_URL` habilitan los botones para abrir la cocina y la caja; el backend debe incluir el dominio de la caja en `FRONTEND_URL` (CORS). Vercel detecta el workspace e instala desde la raíz.
