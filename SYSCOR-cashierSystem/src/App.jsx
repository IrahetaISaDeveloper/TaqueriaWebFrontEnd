import { ThemeProvider } from '@syscor/web-shared/src/context/themeContext'
import { ToastProvider } from '@syscor/web-shared/src/components/ToastProvider'
import CashierDeviceProvider from './context/CashierDeviceProvider'
import Cashier from './pages/Cashier'

// App entry de la caja (POS). Igual que la pantalla de cocina, no hay login
// ni rutas: la caja se identifica como dispositivo (CashierDeviceProvider) y
// muestra el lobby de emparejamiento, la caja cerrada o el punto de venta,
// según tenga token y turno abierto.
export default function App() {
	return (
		<ThemeProvider>
			<CashierDeviceProvider>
				<ToastProvider>
					<Cashier />
				</ToastProvider>
			</CashierDeviceProvider>
		</ThemeProvider>
	)
}
