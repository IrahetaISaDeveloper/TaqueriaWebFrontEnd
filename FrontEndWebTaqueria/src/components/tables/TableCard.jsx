// src/components/tables/TableCard.jsx
import FAIcon from '../commons/FAIcon';
import Select from '../commons/Select';
import { STATUS_CONFIG } from '../../constants/tables';

export default function TableCard({
  table,
  onQuickAction,
  onStatusChange,
  onEdit,
  onDelete,
}) {
  const status = table.status || 'libre';
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.libre;
  const numStr = String(table.number).padStart(2, '0');

  return (
    <div className={`group bg-surface border border-line ${cfg.border} transition-colors flex flex-col justify-between p-4 sm:p-5 min-h-[175px] relative shadow-xs`}>
      {/* Cabecera de la mesa */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 flex items-center justify-center border border-line bg-surfalt text-inkalt">
            <FAIcon icon="chair" size="sm" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-ink leading-tight">
              Mesa {numStr}
            </h3>
            <span className="kick text-[9.5px] text-muted tracking-wider">
              Área de comedor
            </span>
          </div>
        </div>

        {/* Acciones de edición y eliminación */}
        <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity shrink-0">
          <button
            type="button"
            onClick={() => onEdit(table)}
            className="w-7 h-7 flex items-center justify-center border border-line bg-surface text-inkalt hover:border-ac hover:text-ac transition-colors cursor-pointer"
            title="Editar número de mesa"
          >
            <FAIcon icon="pen" size="xs" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(table._id)}
            className="w-7 h-7 flex items-center justify-center border border-line bg-surface text-muted hover:border-ac hover:text-ac transition-colors cursor-pointer"
            title="Eliminar mesa"
          >
            <FAIcon icon="trash" size="xs" />
          </button>
        </div>
      </div>

      {/* Selector de estado en tarjeta */}
      <div className="my-2.5">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className={`kick inline-flex items-center gap-1.5 px-2 py-0.5 border text-[10px] font-semibold ${cfg.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
          <span className="kick text-[9px] text-muted">Cambiar:</span>
        </div>

        <Select
          size="sm"
          value={status}
          onChange={(e) => onStatusChange(table, e.target.value)}
          className="w-full text-xs"
        >
          {Object.entries(STATUS_CONFIG).map(([key, item]) => (
            <option key={key} value={key}>
              {item.label}
            </option>
          ))}
        </Select>
      </div>

      {/* Botón de acción rápida de 1 clic */}
      <div className="pt-2 border-t border-line mt-2">
        <button
          type="button"
          onClick={() => onQuickAction(table)}
          className={`w-full py-1.5 text-xs font-display font-semibold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${cfg.actionStyle}`}
        >
          {cfg.actionText}
        </button>
      </div>
    </div>
  );
}
