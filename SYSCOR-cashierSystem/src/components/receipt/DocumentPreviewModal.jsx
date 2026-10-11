// components/receipt/DocumentPreviewModal.jsx
//
// Vista previa de un documento imprimible (comprobante o corte de caja) tal
// como saldrá en la impresora térmica de 80 mm, con el botón de imprimir. La
// vista previa es el mismo HTML que se imprime (ver @syscor/web-shared/src/utils/cashierDocuments).
import { useEffect, useRef, useState } from 'react';
import FAIcon from '@syscor/web-shared/src/components/FAIcon';
import {
  ModalShell,
  ModalHeader,
  ModalBody,
  ModalFooter,
  MODAL_BTN_PRIMARY,
  MODAL_BTN_SECONDARY,
} from '@syscor/web-shared/src/components/FormModal';
import { printHtml } from '@syscor/web-shared/src/utils/cashierDocuments';

/**
 * @param {Function} buildHtml   (opciones) => Promise<string> | string
 * @param {boolean}  allowCopy   muestra "Imprimir copia" (comprobantes)
 * @param {boolean}  autoPrint   abre el diálogo de impresión al cargar
 */
export default function DocumentPreviewModal({
  icon = 'receipt',
  title,
  subtitle,
  badge,
  buildHtml,
  allowCopy = false,
  autoPrint = false,
  onClose,
  closeLabel = 'Cerrar',
  footerNote,
}) {
  const [html, setHtml] = useState(null);
  const [height, setHeight] = useState(480);
  const [printing, setPrinting] = useState(false);
  const autoPrinted = useRef(false);

  useEffect(() => {
    let ignore = false;
    Promise.resolve(buildHtml({ copy: false })).then((result) => {
      if (!ignore) setHtml(result);
    });
    return () => {
      ignore = true;
    };
  }, [buildHtml]);

  const print = async (copy = false) => {
    setPrinting(true);
    try {
      await printHtml(copy ? await buildHtml({ copy: true }) : html);
    } finally {
      setPrinting(false);
    }
  };

  useEffect(() => {
    if (!autoPrint || !html || autoPrinted.current) return;
    autoPrinted.current = true;
    printHtml(html);
  }, [autoPrint, html]);

  return (
    <ModalShell maxWidth="max-w-lg" zIndex="z-[60]">
      <ModalHeader icon={icon} title={title} subtitle={subtitle} badge={badge} onClose={onClose} />
      <ModalBody className="!bg-surfalt">
        <div className="flex justify-center">
          {html ? (
            <iframe
              title={title}
              srcDoc={html}
              onLoad={(e) => {
                const doc = e.currentTarget.contentDocument;
                if (doc?.body) setHeight(doc.body.scrollHeight + 8);
              }}
              className="bg-white border border-line shadow-xs"
              style={{ width: '310px', height: `${height}px` }}
            />
          ) : (
            <p className="text-sm text-muted py-10">Preparando el documento...</p>
          )}
        </div>
      </ModalBody>
      <ModalFooter note={footerNote}>
        <button type="button" onClick={onClose} className={MODAL_BTN_SECONDARY}>
          {closeLabel}
        </button>
        {allowCopy && (
          <button type="button" onClick={() => print(true)} disabled={!html || printing} className={MODAL_BTN_SECONDARY}>
            <FAIcon icon="copy" size="xs" />
            Imprimir copia
          </button>
        )}
        <button type="button" onClick={() => print(false)} disabled={!html || printing} className={MODAL_BTN_PRIMARY}>
          <FAIcon icon="printer" size="xs" />
          {printing ? 'Imprimiendo...' : 'Imprimir'}
        </button>
      </ModalFooter>
    </ModalShell>
  );
}
