// src/components/commons/ReportButton.jsx
//
// Botón de "Generar reporte" que se coloca en cada pantalla con listado.
// Abre un menú para elegir el formato (PDF, XML o JSON) y, en las pantallas
// cuyos registros tienen foto, si el reporte debe incluirlas.
//
// La pantalla solo le pasa qué exportar (título, columnas, filas); toda la
// maquetación vive en utils/reportExport.js.
import React, { useState, useRef, useEffect } from 'react';
import FAIcon from './FAIcon';
import { generateReport } from '../../utils/reportExport';
import { useToast } from './ToastProvider';

const FORMATS = [
  { id: 'pdf', label: 'PDF', icon: 'file-pdf', hint: 'Para imprimir o archivar' },
  { id: 'xml', label: 'XML', icon: 'file-code', hint: 'Para otros sistemas' },
  { id: 'json', label: 'JSON', icon: 'file-code', hint: 'Para desarrolladores' },
];

// Opciones de imagen. "thumbnail" solo tiene sentido en PDF: en XML y JSON
// lo único que se puede incluir es la URL, así que ahí se usa "link".
const IMAGE_MODES = [
  { id: 'none', label: 'Sin imágenes', hint: 'Solo los datos' },
  { id: 'thumbnail', label: 'Con miniaturas', hint: 'Incrusta las fotos (tarda más)' },
  { id: 'link', label: 'Solo enlaces', hint: 'La dirección de cada foto' },
];

/**
 * @param {string}   title        Nombre del reporte ("Bebidas")
 * @param {string}   subtitle     Línea de contexto opcional (ej. filtros aplicados)
 * @param {Array}    columns      [{ header, value(row), align?, width? }]
 * @param {Array}    rows         Registros a exportar
 * @param {Function} getImageUrl  Si se pasa, la pantalla tiene imágenes y se
 *                                ofrece el selector correspondiente
 * @param {Array}    summary      [{ label, value }] opcional, va arriba del listado
 * @param {string}   itemTag      Nombre de la etiqueta XML de cada registro
 */
const ReportButton = ({
  title,
  subtitle,
  columns,
  rows = [],
  getImageUrl,
  summary,
  itemTag = 'registro',
  className = '',
  label = 'Generar reporte',
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  // Por defecto sin imágenes: es lo más rápido y lo que sirve para la mayoría
  // de usos (revisar precios, contar existencias).
  const [imageMode, setImageMode] = useState('none');

  const menuRef = useRef(null);
  const { addToast } = useToast();

  const hasImages = typeof getImageUrl === 'function';

  // Cerrar el menú al hacer clic fuera, igual que los paneles del TopBar
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleGenerate = async (format) => {
    if (!rows.length) {
      addToast('No hay registros para incluir en el reporte', 'error');
      setIsOpen(false);
      return;
    }

    setGenerating(true);

    try {
      // En XML/JSON no se pueden incrustar fotos: si el usuario eligió
      // miniaturas, para esos formatos se exporta la URL, que es el
      // equivalente más cercano.
      const effectiveMode = format === 'pdf'
        ? imageMode
        : (imageMode === 'none' ? 'none' : 'link');

      await generateReport({
        format,
        title,
        subtitle,
        columns,
        rows,
        summary,
        itemTag,
        imageOptions: hasImages ? { mode: effectiveMode, getUrl: getImageUrl } : { mode: 'none' },
      });

      addToast(`Reporte ${format.toUpperCase()} generado correctamente`, 'success');
      setIsOpen(false);
    } catch (error) {
      console.error('Error al generar el reporte:', error);
      addToast('No se pudo generar el reporte', 'error');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={generating}
        className={compact
          ? 'inline-flex items-center gap-2 px-4 py-2 bg-surface text-inkalt rounded-none text-[13px] font-medium border border-line hover:border-ac hover:text-ac transition-colors disabled:opacity-60 disabled:cursor-wait cursor-pointer'
          : 'inline-flex items-center gap-2 px-4 py-2.5 bg-surface text-inkalt rounded-none text-sm font-display font-semibold border border-line hover:bg-surfalt transition-colors disabled:opacity-60 disabled:cursor-wait'}
      >
        {(generating || !compact) && (
          <FAIcon icon={generating ? 'spinner' : 'file-arrow-down'} className={generating ? 'animate-spin' : ''} />
        )}
        {generating ? 'Generando...' : label}
      </button>

      {isOpen && (
        <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] bg-surface rounded-none border border-line z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-line">
            <p className="text-xs font-display font-bold text-inkalt uppercase tracking-wider">
              Reporte de {title}
            </p>
            <p className="text-[11px] text-muted mt-0.5">
              {rows.length} registro{rows.length === 1 ? '' : 's'} según los filtros aplicados
            </p>
          </div>

          {/* Selector de imágenes: solo en pantallas cuyos registros tienen foto */}
          {hasImages && (
            <div className="px-4 py-3 border-b border-line">
              <p className="text-[11px] font-display font-semibold text-muted uppercase tracking-wider mb-2">
                Imágenes
              </p>
              <div className="space-y-1">
                {IMAGE_MODES.map((mode) => (
                  <label
                    key={mode.id}
                    className="flex items-start gap-2 cursor-pointer group"
                  >
                    <input
                      type="radio"
                      name="report-image-mode"
                      checked={imageMode === mode.id}
                      onChange={() => setImageMode(mode.id)}
                      className="mt-0.5 accent-red-500"
                    />
                    <span className="min-w-0">
                      <span className="block text-xs font-medium text-inkalt group-hover:text-ink">
                        {mode.label}
                      </span>
                      <span className="block text-[10px] text-muted">{mode.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
              {imageMode === 'thumbnail' && (
                <p className="mt-2 text-[10px] text-warn">
                  Las miniaturas solo se incrustan en el PDF; en XML y JSON se exporta el enlace.
                </p>
              )}
            </div>
          )}

          <div className="p-2">
            {FORMATS.map((format) => (
              <button
                key={format.id}
                type="button"
                onClick={() => handleGenerate(format.id)}
                disabled={generating}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-none text-left hover:bg-surfalt transition-colors disabled:opacity-50"
              >
                <FAIcon icon={format.icon} className="text-muted" />
                <span className="min-w-0">
                  <span className="block text-sm font-display font-semibold text-ink">
                    {format.label}
                  </span>
                  <span className="block text-[10px] text-muted">{format.hint}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportButton;
