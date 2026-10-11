# SYSCOR — Sistema de caja (POS)

Punto de venta de Taquería El Corral. Corre en `http://localhost:5175` (`npm run cashier` desde la raíz del workspace).

## Cómo funciona

1. **Emparejar y abrir turno.** La caja no tiene login: muestra un código de 6 dígitos. Un administrador va a
   **Ajustes → Sistema de caja**, escribe el código, elige al **cajero** y cuenta el **fondo inicial**. La caja se abre sola.
   Sin turno abierto, la caja muestra "Caja cerrada" y no cobra nada.
2. **Cobrar.**
   - **Por cobrar:** cuentas de mesa (primero las que el mesero mandó a caja) y pedidos de la app que se pagan al recoger.
   - **Mostrador:** venta directa desde el menú; se cobra al momento y entra a cocina.
   - **Por entregar:** pedidos ya pagados que el cliente recoge en caja cuando cocina los marca listos.
   - Pago en efectivo (con vuelto) o tarjeta (POS simulado), propina opcional en mesas.
   - Documento: **Factura de Consumidor Final** o **Comprobante de Crédito Fiscal** (con NIT, NRC, giro y dirección).
3. **Comprobante.** Se imprime en formato de impresora térmica de 80 mm, con número de control, código de generación,
   sello y QR de consulta, todo **simulado** (documento de prueba, no se transmite a Hacienda).
4. **Turno.** Movimientos de efectivo (entradas/salidas), corte X (parcial) y cierre con **arqueo a ciegas**: el cajero
   cuenta billetes y monedas sin ver lo esperado; la diferencia sale en el corte Z.

Con un turno abierto, la app de meseros cambia "Cobrar la cuenta" por **"Enviar a caja"**.

Los datos fiscales del emisor (NIT, NRC) son de prueba: están en `backEnd/src/constants/fiscal.js`.
