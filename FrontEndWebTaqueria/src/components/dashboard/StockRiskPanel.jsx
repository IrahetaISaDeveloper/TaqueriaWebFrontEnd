// src/components/dashboard/StockRiskPanel.jsx
// Proyección de qué insumos se van a agotar pronto, generada por IA (Gemini)
// a partir del inventario actual y los pedidos de los últimos 7 días. Es una
// sugerencia: si la IA no responde, el panel simplemente queda vacío, nunca
// rompe el dashboard.
import React, { useEffect, useState } from 'react';
import Card from '../commons/Card';
import FAIcon from '../commons/FAIcon';

const API_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/ai/stock-forecast` : '/api/ai/stock-forecast';

const StockRiskPanel = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);

  const fetchForecast = async (force = false) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}${force ? '?force=true' : ''}`, { credentials: 'include' });
      if (!res.ok) {
        setAvailable(false);
        return;
      }
      const data = await res.json();
      setAlerts(Array.isArray(data.alerts) ? data.alerts : []);
      setAvailable(true);
    } catch {
      setAvailable(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, []);

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h3 className="text-base sm:text-lg font-display font-bold text-ink flex items-center gap-2">
            <FAIcon icon="wand-magic-sparkles" size="sm" className="text-ac" />
            Stock en riesgo
          </h3>
          <p className="text-xs sm:text-sm text-inkalt">Proyección de IA sobre lo que podría agotarse pronto</p>
        </div>
        <button
          type="button"
          onClick={() => fetchForecast(true)}
          disabled={loading}
          className="text-xs font-display font-semibold text-ac hover:text-ac disabled:opacity-50"
        >
          {loading ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      {!available && (
        <p className="text-xs text-muted text-center py-6">
          La proyección de IA no está disponible en este momento.
        </p>
      )}

      {available && !loading && alerts.length === 0 && (
        <p className="text-xs text-muted text-center py-6">
          Sin riesgos detectados por ahora.
        </p>
      )}

      {available && alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, idx) => (
            <div key={idx} className="flex items-start gap-3 bg-warnsoft/80 border border-warn rounded-none p-3">
              <FAIcon icon="triangle-exclamation" size="sm" className="text-warn mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-display font-semibold text-ink">
                  {alert.ingredient} · {alert.currentStock} {alert.unit}
                </p>
                <p className="text-xs text-inkalt mt-0.5">
                  Se agotaría en ~{alert.projectedDaysLeft} día(s). {alert.recommendation}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default StockRiskPanel;
