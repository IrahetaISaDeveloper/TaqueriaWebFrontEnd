// pages/Cashier.jsx
//
// La caja completa:
//   - Sin token: lobby con el código de emparejamiento.
//   - Emparejada sin turno: "Caja cerrada", esperando que el admin lo abra.
//   - Con turno abierto: el punto de venta.
// Al cerrar el turno se muestra el corte Z para imprimirlo, y queda a mano
// en la pantalla de caja cerrada.
import { useCallback, useState } from 'react';
import LoadingSpinner from '@syscor/web-shared/src/components/LoadingSpinner';
import useCashierDevice from '../hooks/useCashierDevice';
import useCashierStatus from '../hooks/useCashierStatus';
import { PairingLobby, ShiftClosedLobby, ConnectionErrorLobby } from '../components/lobby/CashierLobby';
import PosScreen from '../components/pos/PosScreen';
import DocumentPreviewModal from '../components/receipt/DocumentPreviewModal';
import { buildShiftReportHtml } from '@syscor/web-shared/src/utils/cashierDocuments';
import { money } from '../utils/format';

function PairedCashier() {
  const { session, issuer, status, loading, error, refetch, setSession } = useCashierStatus();
  // Corte Z del último turno cerrado en esta pantalla: { session, issuer }
  const [lastClosed, setLastClosed] = useState(null);
  const [showZ, setShowZ] = useState(false);

  const handleShiftClosed = useCallback(({ session: closed, issuer: closedIssuer }) => {
    setLastClosed({ session: closed, issuer: closedIssuer || issuer });
    setShowZ(true);
    setSession(null);
  }, [issuer, setSession]);

  const buildZ = useCallback(
    () => buildShiftReportHtml(lastClosed.session, lastClosed.issuer, 'Z'),
    [lastClosed]
  );

  if (loading && !status) {
    return (
      <div className="h-dvh flex items-center justify-center bg-bg">
        <LoadingSpinner size="lg" color="gray" text="Conectando con la caja..." />
      </div>
    );
  }

  if (!status) return <ConnectionErrorLobby error={error} onRetry={refetch} />;

  return (
    <>
      {session ? (
        <PosScreen session={session} issuer={issuer} onSessionUpdated={setSession} onShiftClosed={handleShiftClosed} />
      ) : (
        <ShiftClosedLobby onShowLastReport={lastClosed ? () => setShowZ(true) : undefined} />
      )}

      {showZ && lastClosed && (
        <DocumentPreviewModal
          icon="lock"
          title="Corte Z"
          subtitle={`Cierre del turno ${lastClosed.session.code}`}
          badge={lastClosed.session.difference === null ? 'Sin arqueo' : `${lastClosed.session.difference >= 0 ? '+' : '−'}${money(Math.abs(lastClosed.session.difference))}`}
          buildHtml={buildZ}
          autoPrint
          footerNote="Entrega el corte impreso y el efectivo al administrador"
          onClose={() => setShowZ(false)}
        />
      )}
    </>
  );
}

export default function Cashier() {
  const { isPaired } = useCashierDevice();
  return isPaired ? <PairedCashier /> : <PairingLobby />;
}
