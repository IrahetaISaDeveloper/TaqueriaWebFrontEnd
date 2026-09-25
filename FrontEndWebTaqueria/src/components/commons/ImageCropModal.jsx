// src/components/commons/ImageCropModal.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import FAIcon from './FAIcon';

// Tamaño del marco circular que se ve en pantalla y resolución final exportada.
// La imagen se recorta en cuadrado (el redondeo a círculo lo hace el CSS del
// avatar donde sea que se muestre), así no depende de transparencia ni de PNG.
const FRAME_SIZE = 260;
const OUTPUT_SIZE = 480;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

// Modal para ajustar una foto de perfil antes de subirla: permite arrastrarla
// para reposicionarla y usar el control de zoom para acercarla o alejarla.
// Al confirmar, genera un archivo nuevo ya recortado del tamaño final.
const ImageCropModal = ({ file, onCancel, onConfirm }) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [naturalSize, setNaturalSize] = useState(null); // { width, height }
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const imgRef = useRef(null);
  const dragStartRef = useRef({ pointerX: 0, pointerY: 0, posX: 0, posY: 0 });

  // Carga el archivo elegido como URL temporal y mide sus dimensiones reales.
  // El componente no se desmonta entre usos (solo deja de mostrarse cuando
  // no hay archivo), así que reiniciamos el zoom aquí para que cada foto
  // nueva empiece siempre centrada y a su tamaño mínimo, sin arrastrar el
  // ajuste que haya quedado de una sesión anterior.
  useEffect(() => {
    if (!file) return;

    setZoom(1);

    const url = URL.createObjectURL(file);
    setImageUrl(url);

    const img = new Image();
    img.onload = () => setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    img.src = url;

    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Tamaño que ocupa la imagen dentro del marco al "cubrirlo" (como object-fit: cover)
  // multiplicado por el zoom elegido
  const getDrawSize = useCallback(() => {
    if (!naturalSize) return { width: FRAME_SIZE, height: FRAME_SIZE };

    const baseScale = Math.max(FRAME_SIZE / naturalSize.width, FRAME_SIZE / naturalSize.height);
    const scale = baseScale * zoom;

    return { width: naturalSize.width * scale, height: naturalSize.height * scale };
  }, [naturalSize, zoom]);

  // Evita que la imagen se pueda arrastrar hasta dejar huecos vacíos dentro del marco
  const clampPosition = useCallback(
    (pos, drawSize) => {
      const minX = FRAME_SIZE - drawSize.width;
      const minY = FRAME_SIZE - drawSize.height;

      return {
        x: Math.min(0, Math.max(minX, pos.x)),
        y: Math.min(0, Math.max(minY, pos.y)),
      };
    },
    []
  );

  // Centra la imagen cada vez que se carga una nueva o se conocen sus dimensiones
  useEffect(() => {
    if (!naturalSize) return;
    const drawSize = getDrawSize();
    setPosition({ x: (FRAME_SIZE - drawSize.width) / 2, y: (FRAME_SIZE - drawSize.height) / 2 });
    // Solo queremos recentrar cuando cambia la imagen, no en cada cambio de zoom
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [naturalSize]);

  const handleZoomChange = (newZoom) => {
    setZoom(newZoom);
    setPosition((prev) => clampPosition(prev, getDrawSizeForZoom(newZoom)));
  };

  // Igual que getDrawSize pero con un zoom específico (para reclampear al mover el slider)
  const getDrawSizeForZoom = (z) => {
    if (!naturalSize) return { width: FRAME_SIZE, height: FRAME_SIZE };
    const baseScale = Math.max(FRAME_SIZE / naturalSize.width, FRAME_SIZE / naturalSize.height);
    const scale = baseScale * z;
    return { width: naturalSize.width * scale, height: naturalSize.height * scale };
  };

  const handlePointerDown = (e) => {
    setIsDragging(true);
    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      posX: position.x,
      posY: position.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;

    const dx = e.clientX - dragStartRef.current.pointerX;
    const dy = e.clientY - dragStartRef.current.pointerY;
    const nextPos = { x: dragStartRef.current.posX + dx, y: dragStartRef.current.posY + dy };

    setPosition(clampPosition(nextPos, getDrawSize()));
  };

  const handlePointerUp = () => setIsDragging(false);

  // Dibuja el recorte actual en un canvas y lo entrega como un File listo para subir
  const handleConfirm = () => {
    if (!imgRef.current || !naturalSize) return;

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;

    const ctx = canvas.getContext('2d');
    const ratio = OUTPUT_SIZE / FRAME_SIZE;
    const drawSize = getDrawSize();

    ctx.drawImage(
      imgRef.current,
      position.x * ratio,
      position.y * ratio,
      drawSize.width * ratio,
      drawSize.height * ratio
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const croppedFile = new File([blob], 'profile.jpg', { type: 'image/jpeg' });
        onConfirm(croppedFile);
      },
      'image/jpeg',
      0.92
    );
  };

  if (!file) return null;

  const drawSize = getDrawSize();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-surface rounded-none border border-line overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-line">
          <h3 className="font-display font-bold text-ink text-base">Ajustar foto de perfil</h3>
          <p className="text-xs text-muted mt-0.5">Arrastra la imagen y usa el control para acercarla</p>
        </div>

        <div className="p-4 sm:p-5 flex flex-col items-center gap-4">
          <div
            className="relative rounded-full overflow-hidden bg-surfalt border-2 border-acline shadow-inner touch-none select-none"
            style={{ width: FRAME_SIZE, height: FRAME_SIZE, cursor: isDragging ? 'grabbing' : 'grab' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            {imageUrl && (
              <img
                ref={imgRef}
                src={imageUrl}
                alt="Foto a recortar"
                draggable={false}
                className="absolute top-0 left-0 max-w-none pointer-events-none"
                style={{
                  width: drawSize.width,
                  height: drawSize.height,
                  transform: `translate(${position.x}px, ${position.y}px)`,
                }}
              />
            )}
          </div>

          <div className="w-full flex items-center gap-3">
            <FAIcon icon="magnifying-glass-minus" size="sm" className="text-muted" />
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={(e) => handleZoomChange(Number(e.target.value))}
              className="flex-1 accent-red-500"
              aria-label="Acercar o alejar la foto"
            />
            <FAIcon icon="magnifying-glass-plus" size="sm" className="text-muted" />
          </div>
        </div>

        <div className="flex gap-2 px-4 sm:px-5 py-4 border-t border-line">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-none font-display font-semibold text-sm text-inkalt bg-surfalt hover:bg-line transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-none font-display font-semibold text-sm text-white bg-ac hover:bg-ac transition-colors"
          >
            <FAIcon icon="check" size="sm" />
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropModal;
