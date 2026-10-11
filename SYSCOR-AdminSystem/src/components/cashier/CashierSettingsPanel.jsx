// components/cashier/CashierSettingsPanel.jsx
//
// Ajustes → Sistema de caja. Aquí el administrador habilita la caja (escribe
// el código que muestra, elige al cajero y el fondo inicial), abre y cierra
// turnos, ve en vivo lo que lleva cobrado cada caja y consulta los cortes.
import { useState } from 'react';
import FAIcon from '@syscor/web-shared/src/components/FAIcon';
import ConfirmModal from '@syscor/web-shared/src/components/ConfirmModal';
import { useToast } from '@syscor/web-shared/src/components/ToastProvider';
import useCashierAdmin from '../../hooks/useCashierAdmin';
import OpenShiftModal from './OpenShiftModal';
import AdminCloseShiftModal from './AdminCloseShiftModal';
import ShiftReportModal from './ShiftReportModal';

// Dirección de la caja (proyecto SYSCOR-cashierSystem). En desarrollo corre
// en el puerto 5175; en producción se define VITE_CASHIER_URL.
const CASHIER_URL = import.meta.env.VITE_CASHIER_URL || (import.meta.env.DEV ? 'http://localhost:5175' : '');

const money = (n) => `$${Number(n || 0).toFixed(2)}`;
const formatDate = (date) =>
  date ? new Date(date).toLocaleString('es-SV', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const Toggle = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
      checked ? 'bg-ac' : 'bg-line'
    }`}
  >
    <span
      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
        checked ? 'translate-x-4' : 'translate-x-0'
      }`}
    />
  </button>
);

const smallBtn = 'inline-flex items-center gap-1.5 px-3 py-1.5 border text-[12.5px] transition-colors disabled:opacity-60 cursor-pointer';

const differenceLabel = (session) => {
  if (session.difference === null || session.difference === undefined) return { text: 'Sin arqueo', tone: 'text-muted' };
  if (session.difference === 0) return { text: 'Cuadrada', tone: 'text-ok' };
  if (session.difference > 0) return { text: `+${money(session.difference)}`, tone: 'text-warn' };
  return { text: `−${money(Math.abs(session.difference))}`, tone: 'text-ac' };
};

export default function CashierSettingsPanel({ isAdmin }) {
  const { addToast } = useToast();
  const cashierAdmin = useCashierAdmin({ enabled: isAdmin });
  const { cashier, devices, recentSessions, cashiers, loading, busy } = cashierAdmin;

  // null | { device: null } (emparejar) | { device } (abrir turno en una caja)
  const [openShiftFor, setOpenShiftFor] = useState(null);
  const [closingSession, setClosingSession] = useState(null);
  const [reportId, setReportId] = useState(null);
  const [confirmOff, setConfirmOff] = useState(false);
  const [deviceToUnpair, setDeviceToUnpair] = useState(null);

  const handleOpenShift = async ({ code, cashierId, openingFloat, deviceId }) => {
    const result = deviceId
      ? await cashierAdmin.openShift({ deviceId, cashierId, openingFloat })
      : await cashierAdmin.pairDevice({ code, cashierId, openingFloat });
    if (result.success) addToast(result.message || 'Turno abierto', 'success');
    return result;
  };

  const handleCloseShift = async (sessionId, payload) => {
    const result = await cashierAdmin.closeShift(sessionId, payload);
    if (result.success) {
      setClosingSession(null);
      addToast('Turno cerrado', 'success');
      setReportId(sessionId);
    }
    return result;
  };

  const handleUnpair = async () => {
    const result = await cashierAdmin.unpairDevice(deviceToUnpair.deviceId);
    setDeviceToUnpair(null);
    addToast(result.success ? 'Caja desvinculada' : result.message, result.success ? 'success' : 'error');
  };

  const handleDisable = async () => {
    const result = await cashierAdmin.disableCashier();
    setConfirmOff(false);
    addToast(result.success ? 'Sistema de caja deshabilitado' : result.message, result.success ? 'success' : 'error');
  };

  const handleToggle = (value) => {
    if (value) setOpenShiftFor({ device: null });
    else setConfirmOff(true);
  };

  return (
    <div className="max-w-3xl border border-line bg-surface p-6 sm:p-7 border-l-2 border-l-ac space-y-6">
      <div>
        <p className="kick text-ac mb-1.5">PUNTO DE VENTA · POS</p>
        <h2 className="text-lg sm:text-xl font-bold text-ink">Sistema de caja</h2>
        <p className="text-sm text-muted mt-1 leading-relaxed">
          La caja muestra un código en su pantalla. Al habilitarla, escribe ese código, elige al cajero del turno y
          el fondo inicial: la caja se abre sola y empieza a cobrar.
        </p>
      </div>

      {!isAdmin && (
        <div className="bg-warnsoft/30 border border-warn text-warn text-xs sm:text-sm p-3.5 flex items-center gap-2.5">
          <FAIcon icon="triangle-exclamation" size="sm" />
          <span>Solo un administrador puede habilitar la caja y abrir o cerrar turnos.</span>
        </div>
      )}

      <div className={`flex items-center justify-between gap-4 p-4 border ${cashier.enabled ? 'border-ok bg-oksoft' : 'border-line bg-surfalt/40'}`}>
        <div className="flex items-start gap-3.5 min-w-0">
          <span className={`shrink-0 w-10 h-10 border flex items-center justify-center ${cashier.enabled ? 'border-ok text-ok' : 'border-line text-muted'}`}>
            <FAIcon icon="cash-register" weight={cashier.enabled ? 'fill' : 'regular'} />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-ink text-sm sm:text-base">{cashier.enabled ? 'Habilitado' : 'Deshabilitado'}</p>
            <p className="text-xs sm:text-sm text-muted mt-0.5 leading-relaxed">
              {cashier.changedAt
                ? `${cashier.enabled ? 'Habilitado' : 'Deshabilitado'} por ${cashier.changedBy || 'un administrador'} · ${formatDate(cashier.changedAt)}`
                : 'Todavía no se ha habilitado nunca'}
            </p>
          </div>
        </div>
        <Toggle checked={Boolean(cashier.enabled)} onChange={handleToggle} disabled={!isAdmin || busy || loading} />
      </div>

      <ul className="space-y-2.5 text-xs sm:text-sm text-inkalt leading-relaxed">
        <li className="flex gap-2.5">
          <FAIcon icon="user" size="sm" className="text-ac mt-0.5 shrink-0" />
          <span>La caja no inicia sesión: todo lo que se cobra en un turno queda a nombre del cajero que eliges al abrirlo.</span>
        </li>
        <li className="flex gap-2.5">
          <FAIcon icon="armchair" size="sm" className="text-ac mt-0.5 shrink-0" />
          <span>
            Con un turno abierto, los meseros ya no cobran las mesas: las <strong>envían a caja</strong> desde su app. Sin
            turno abierto, cobran como siempre.
          </span>
        </li>
        <li className="flex gap-2.5">
          <FAIcon icon="receipt" size="sm" className="text-ac mt-0.5 shrink-0" />
          <span>
            Los cobros son simulados: la caja emite Factura o Crédito Fiscal con el formato de Hacienda, pero como
            documento de prueba, y la tarjeta no se carga de verdad.
          </span>
        </li>
      </ul>

      {isAdmin && (
        <div className="pt-5 border-t border-line space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="kick text-ink">CAJAS · <span className="num">{devices.length}</span></p>
            {cashier.enabled && (
              <button type="button" onClick={() => setOpenShiftFor({ device: null })} disabled={busy} className={`${smallBtn} border-ac text-ac hover:bg-ac hover:text-white`}>
                <FAIcon icon="plus" size="xs" />
                Emparejar otra caja
              </button>
            )}
          </div>

          {loading ? (
            <p className="text-sm text-muted">Cargando cajas...</p>
          ) : devices.length === 0 ? (
            <p className="text-sm text-muted border border-dashed border-line px-4 py-3">
              Ninguna caja emparejada. Abre la caja y activa el interruptor de arriba con el código que muestra.
            </p>
          ) : (
            <ul className="space-y-3">
              {devices.map((device) => {
                const session = device.session;
                const s = session?.summary || {};
                return (
                  <li key={device.deviceId} className={`border ${session ? 'border-ok' : 'border-line'}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <span className={`shrink-0 w-9 h-9 border flex items-center justify-center ${session ? 'border-ok text-ok' : 'border-line text-muted'}`}>
                          <FAIcon icon={session ? 'lock-open' : 'lock'} size="sm" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm text-ink font-medium">
                            {device.label} <span className="num text-muted text-[12px]">· {device.shortId}</span>
                          </p>
                          <p className="text-[12px] text-muted">
                            {session
                              ? `Turno ${session.code} · ${session.cashier?.name} · desde ${formatDate(session.openedAt)}`
                              : 'Caja cerrada: sin turno abierto'}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {session ? (
                          <>
                            <button type="button" onClick={() => setReportId(session.id)} className={`${smallBtn} border-line text-inkalt hover:border-ac hover:text-ac`}>
                              <FAIcon icon="receipt" size="xs" />
                              Corte X
                            </button>
                            <button type="button" onClick={() => setClosingSession(session)} disabled={busy} className={`${smallBtn} border-line text-inkalt hover:border-ac hover:text-ac`}>
                              <FAIcon icon="lock" size="xs" />
                              Cerrar turno
                            </button>
                          </>
                        ) : (
                          <button type="button" onClick={() => setOpenShiftFor({ device })} disabled={busy} className={`${smallBtn} border-ac text-ac hover:bg-ac hover:text-white`}>
                            <FAIcon icon="lock-open" size="xs" />
                            Abrir turno
                          </button>
                        )}
                        <button type="button" onClick={() => setDeviceToUnpair(device)} disabled={busy} className={`${smallBtn} border-line text-inkalt hover:border-ac hover:text-ac`}>
                          <FAIcon icon="ban" size="xs" />
                          Desvincular
                        </button>
                      </div>
                    </div>
                    {session && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-line divide-x divide-line">
                        {[
                          ['VENTAS', money(s.sales), `${s.receipts ?? 0} cobros`],
                          ['EFECTIVO', money(s.byMethod?.cash?.amount), `${s.byMethod?.cash?.count ?? 0} cobros`],
                          ['TARJETA', money(s.byMethod?.card?.amount), `${s.byMethod?.card?.count ?? 0} cobros`],
                          ['EN GAVETA', money(s.expectedCash), `fondo ${money(s.openingFloat)}`],
                        ].map(([label, value, hint]) => (
                          <div key={label} className="px-4 py-2.5">
                            <p className="kick text-muted">{label}</p>
                            <p className="num text-lg text-ink">{value}</p>
                            <p className="text-[11px] text-muted">{hint}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {isAdmin && (
        <div className="pt-5 border-t border-line space-y-3">
          <p className="kick text-ink">ÚLTIMOS CORTES</p>
          {recentSessions.length === 0 ? (
            <p className="text-sm text-muted">Todavía no se ha cerrado ningún turno.</p>
          ) : (
            <div className="overflow-x-auto border border-line">
              <table className="w-full text-left border-collapse min-w-[560px] text-[13px]">
                <thead>
                  <tr className="kick text-muted border-b border-line">
                    <th className="py-2.5 px-3">TURNO</th>
                    <th className="py-2.5 px-3">CAJERO</th>
                    <th className="py-2.5 px-3">CIERRE</th>
                    <th className="py-2.5 px-3 text-right">VENTAS</th>
                    <th className="py-2.5 px-3 text-right">DIFERENCIA</th>
                    <th className="py-2.5 px-3 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {recentSessions.map((session) => {
                    const diff = differenceLabel(session);
                    return (
                      <tr key={session.id} className="hover:bg-surfalt/50">
                        <td className="py-2.5 px-3 num text-ink">{session.code}</td>
                        <td className="py-2.5 px-3 text-inkalt">{session.cashier?.name}</td>
                        <td className="py-2.5 px-3 text-muted">{formatDate(session.closedAt)}</td>
                        <td className="py-2.5 px-3 text-right num text-ink">{money(session.summary?.sales)}</td>
                        <td className={`py-2.5 px-3 text-right num ${diff.tone}`}>{diff.text}</td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => setReportId(session.id)}
                            className="w-7 h-7 inline-flex items-center justify-center border border-line text-muted hover:border-ac hover:text-ac cursor-pointer"
                            title="Ver corte"
                            aria-label={`Ver corte ${session.code}`}
                          >
                            <FAIcon icon="eye" size="xs" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {CASHIER_URL && (
        <div className="pt-1">
          <a
            href={CASHIER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-ac text-ac bg-surface text-sm font-medium hover:bg-ac hover:text-white transition-colors"
          >
            <FAIcon icon="arrow-right" size="sm" />
            <span>Abrir la caja</span>
          </a>
        </div>
      )}

      <OpenShiftModal
        isOpen={Boolean(openShiftFor)}
        device={openShiftFor?.device || null}
        cashiers={cashiers}
        busy={busy}
        enablesSystem={!cashier.enabled}
        onClose={() => setOpenShiftFor(null)}
        onSubmit={handleOpenShift}
      />

      {closingSession && (
        <AdminCloseShiftModal session={closingSession} busy={busy} onClose={() => setClosingSession(null)} onSubmit={handleCloseShift} />
      )}

      <ShiftReportModal sessionId={reportId} fetchReport={cashierAdmin.fetchReport} onClose={() => setReportId(null)} />

      <ConfirmModal
        isOpen={confirmOff}
        onClose={() => setConfirmOff(false)}
        onConfirm={handleDisable}
        loading={busy}
        variant="warning"
        icon="cash-register"
        title="Deshabilitar sistema de caja"
        message="Todas las cajas pierden su acceso en este momento y sus turnos abiertos se cierran sin arqueo. Los meseros vuelven a cobrar las mesas desde su app. Los cobros ya hechos no cambian."
        confirmText="Deshabilitar"
      />

      <ConfirmModal
        isOpen={Boolean(deviceToUnpair)}
        onClose={() => setDeviceToUnpair(null)}
        onConfirm={handleUnpair}
        loading={busy}
        variant="warning"
        icon="ban"
        title="Desvincular caja"
        message={`La caja ${deviceToUnpair?.shortId || ''} pierde su acceso en este momento.${deviceToUnpair?.session ? ' Su turno abierto se cierra sin arqueo.' : ''}`}
        confirmText="Desvincular"
      />
    </div>
  );
}
