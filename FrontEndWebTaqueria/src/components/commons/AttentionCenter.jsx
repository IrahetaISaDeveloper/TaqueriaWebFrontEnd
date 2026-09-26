// src/components/commons/AttentionCenter.jsx
import React, { useState, useMemo } from 'react';
import FAIcon from './FAIcon';

// Avatar con fallback inteligente: si la imagen falla o no existe,
// muestra las iniciales con un fondo estético para evitar los íconos de imagen rota.
const AvatarItem = ({ src, name = '' }) => {
  const [imgError, setImgError] = useState(false);

  const initials = useMemo(() => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [name]);

  const hasValidImage = src && !imgError && !src.includes('placehold.co') && !src.includes('Sin+imagen');

  if (hasValidImage) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setImgError(true)}
        className="w-11 h-11 rounded-lg object-cover shrink-0 border border-line shadow-2xs"
      />
    );
  }

  return (
    <div
      className="w-11 h-11 rounded-lg shrink-0 flex items-center justify-center font-display font-bold text-xs bg-ac text-white select-none shadow-2xs"
      title={name}
    >
      {initials}
    </div>
  );
};

// Formatea el motivo o lista de campos pendientes en chips limpios y ordenados
const parseReasonChips = (rawReason) => {
  if (!rawReason) return [];
  if (Array.isArray(rawReason)) return rawReason;
  if (typeof rawReason === 'string') {
    return rawReason
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [String(rawReason)];
};

const AttentionCenter = ({
  items = [],
  getKey = (item) => item?._id || item?.id,
  getTitle = (item) => item?.name || 'Registro',
  getSubtitle,
  getImage,
  getReason,
  onEdit,
  isOpen: controlledIsOpen,
  onOpenChange,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const setOpen = (val) => {
    if (!isControlled) {
      setInternalIsOpen(val);
    }
    onOpenChange?.(val);
  };

  const count = items.length;
  const hasIssues = count > 0;

  const handleItemClick = (item) => {
    setOpen(false);
    onEdit?.(item);
  };

  // Filtrado rápido de elementos
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter((item) => {
      const title = getTitle(item).toLowerCase();
      const subtitle = getSubtitle?.(item)?.toLowerCase() || '';
      return title.includes(q) || subtitle.includes(q);
    });
  }, [items, searchQuery, getTitle, getSubtitle]);

  return (
    <>
      {/* Botón trigger principal */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-display font-semibold cursor-pointer transition-all duration-150 border shadow-2xs hover:shadow-sm active:scale-[0.98] ${
          hasIssues
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/20'
        }`}
      >
        <span
          className={`w-5 h-5 rounded-full flex items-center justify-center text-white shrink-0 text-[10px] ${
            hasIssues ? 'bg-amber-600 dark:bg-amber-500' : 'bg-emerald-600 dark:bg-emerald-500'
          }`}
        >
          <FAIcon icon={hasIssues ? 'triangle-exclamation' : 'check'} size="xs" />
        </span>
        <span>{hasIssues ? `Atención: ${count} pendientes` : 'Todo en orden'}</span>
      </button>

      {/* Modal Rediseñado */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-surface rounded-2xl border border-line w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Cabecera estilizada */}
            <div className="px-5 pt-5 pb-4 bg-surface flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${
                    hasIssues
                      ? 'bg-ac border-ac text-white shadow-sm'
                      : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-400'
                  }`}
                >
                  <FAIcon icon={hasIssues ? 'triangle-exclamation' : 'check-circle'} size="lg" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-display font-bold text-ink leading-tight">
                      {hasIssues ? 'Expedientes por completar' : 'Todo en orden'}
                    </h2>
                    {hasIssues && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                        {count} {count === 1 ? 'pendiente' : 'pendientes'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted truncate mt-0.5">
                    {hasIssues
                      ? 'Colaboradores con información incompleta que requiere atención'
                      : 'Todos los registros cuentan con sus datos completos'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-lg text-muted hover:text-ac hover:bg-ac/10 flex items-center justify-center transition-colors shrink-0 ml-2 cursor-pointer"
                title="Cerrar ventana"
              >
                <FAIcon icon="times" size="sm" />
              </button>
            </div>

            {/* Barra de búsqueda si hay múltiples registros */}
            {hasIssues && count > 3 && (
              <div className="px-5 pb-4 bg-surface flex items-center gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-xs pointer-events-none">
                    <FAIcon icon="magnifying-glass" size="xs" />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por nombre o puesto..."
                    className="w-full pl-8 pr-7 py-2 rounded-lg text-xs bg-surface border border-line focus:border-ac focus:outline-none text-ink placeholder:text-muted/70 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ac text-xs cursor-pointer"
                    >
                      <FAIcon icon="times" size="xs" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Contenido / Listado */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3 border-t border-line">
              {!hasIssues ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
                    <FAIcon icon="face-smile" size="2xl" className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-ink font-display font-bold text-base">
                    ¡Excelente! No hay nada pendiente
                  </p>
                  <p className="text-muted text-xs mt-1 max-w-sm">
                    Todos los expedientes y registros tienen su información debidamente completada.
                  </p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm font-semibold text-ink">No se encontraron expedientes</p>
                  <p className="text-xs text-muted mt-1">
                    No hay resultados que coincidan con "{searchQuery}"
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredItems.map((item) => {
                    const clickable = Boolean(onEdit);
                    const title = getTitle(item);
                    const subtitle = getSubtitle?.(item);
                    const chips = parseReasonChips(getReason?.(item));
                    const visibleChips = chips.slice(0, 3);
                    const remainingCount = chips.length - visibleChips.length;

                    return (
                      <div
                        key={getKey(item)}
                        role={clickable ? 'button' : undefined}
                        tabIndex={clickable ? 0 : undefined}
                        onClick={clickable ? () => handleItemClick(item) : undefined}
                        onKeyDown={clickable ? (e) => e.key === 'Enter' && handleItemClick(item) : undefined}
                        className={`group relative bg-white dark:bg-surface border border-amber-300 dark:border-amber-500/40 hover:border-ac rounded-xl p-3.5 transition-all duration-150 flex flex-col justify-between text-left shadow-2xs hover:shadow-sm ${
                          clickable ? 'cursor-pointer active:scale-[0.99]' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <AvatarItem src={getImage?.(item)} name={title} />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1.5">
                              <h3 className="font-display font-bold text-ink text-[13.5px] leading-tight truncate group-hover:text-ac transition-colors">
                                {title}
                              </h3>
                              {clickable && (
                                <span className="text-muted/60 group-hover:text-ac group-hover:translate-x-0.5 transition-all shrink-0">
                                  <FAIcon icon="arrow-right" size="xs" />
                                </span>
                              )}
                            </div>

                            {subtitle && (
                              <p className="text-[11px] text-muted font-medium mt-0.5 truncate">
                                {subtitle}
                              </p>
                            )}

                            {/* Tags de campos pendientes */}
                            {chips.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2.5">
                                {visibleChips.map((chip, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1.5 px-2 py-1 text-[10.5px] font-medium bg-amber-50 dark:bg-amber-500/10 text-ink border border-amber-300 dark:border-amber-500/40 rounded-full leading-none"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                    <span className="truncate max-w-[130px]">{chip}</span>
                                  </span>
                                ))}
                                {remainingCount > 0 && (
                                  <span
                                    className="inline-flex items-center px-2 py-1 text-[10px] font-semibold bg-surfalt text-muted border border-line rounded-full leading-none"
                                    title={chips.slice(3).join(', ')}
                                  >
                                    +{remainingCount} más
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {clickable && (
                          <div className="mt-3 pt-2.5 border-t border-line/60 flex items-center justify-between text-[11px] text-muted/80 transition-colors">
                            <span className="font-medium">Haz clic para completar ficha</span>
                            <span className="text-ac font-semibold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              Editar
                              <FAIcon icon="pen" size="xs" />
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pie de modal */}
            <div className="px-5 py-3 border-t border-line bg-surface flex items-center justify-between text-xs">
              <span className="text-muted hidden sm:inline">
                {hasIssues
                  ? 'Selecciona un colaborador para editar su expediente.'
                  : 'No se requieren acciones.'}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-1.5 text-xs font-display font-semibold text-inkalt hover:text-ink bg-surface hover:bg-surfalt border border-line rounded-lg transition-colors ml-auto cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AttentionCenter;
