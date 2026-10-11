// Mismo destino del backend, proxy y assets de marca que el panel y cocina
// (paquete compartido). La caja corre en el 5175, que el backend permite por CORS.
import createViteConfig from '@syscor/web-shared/vite/createViteConfig.js'

export default createViteConfig({ port: 5175 })
