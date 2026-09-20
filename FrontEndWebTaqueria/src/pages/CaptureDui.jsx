// src/pages/CaptureDui.jsx
//
// Pantalla que abre el TELÉFONO al escanear el QR que muestra la
// computadora. Es pública a propósito: el teléfono del admin no tiene por
// qué tener la sesión de SYSCOR iniciada, y pedírselo ahí haría inútil todo
// el flujo. El control de acceso lo da el token del enlace, que es aleatorio,
// de un solo uso y caduca a los 10 minutos.
//
// Deliberadamente mínima: dos fotos, confirmar, listo. Quien la usa está de
// pie con un documento en la mano, no navegando el panel.
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import FAIcon from '../components/commons/FAIcon';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const Slot = ({ label, hint, file, onPick, onClear }) => {
  const preview = file ? URL.createObjectURL(file) : null;

  // La URL temporal del preview se libera al cambiar de archivo para no
  // acumular blobs en memoria del teléfono.
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  return (
    <div className="bg-surface rounded-none border border-line p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="font-display font-bold text-ink text-sm">{label}</p>
          <p className="text-[11px] text-muted">{hint}</p>
        </div>
        {file && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-ac font-display font-semibold"
          >
            Cambiar
          </button>
        )}
      </div>

      {preview ? (
        <img src={preview} alt={label} className="w-full h-44 object-cover rounded-none" />
      ) : (
        <label className="flex flex-col items-center justify-center gap-2 h-44 rounded-none border-2 border-dashed border-line bg-surfalt cursor-pointer active:bg-surfalt transition-colors">
          <FAIcon icon="camera" size="2xl" className="text-muted" />
          <span className="text-xs font-display font-semibold text-muted">Tomar foto</span>
          {/* capture="environment" hace que el teléfono abra directamente la
              cámara trasera en vez del explorador de archivos. */}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => onPick(e.target.files?.[0] || null)}
            className="hidden"
          />
        </label>
      )}
    </div>
  );
};

export default function CaptureDui() {
  const { token } = useParams();

  const [checking, setChecking] = useState(true);
  const [sessionError, setSessionError] = useState(null);
  const [front, setFront] = useState(null);
  const [back, setBack] = useState(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  // Al abrir, se comprueba que el enlace siga vigente antes de pedirle
  // fotos a nadie: no tiene sentido tomar dos fotos para descubrir después
  // que la sesión venció.
  useEffect(() => {
    let cancelled = false;

    fetch(`${API_URL}/users/dui-scan/capture/${token}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (!res.ok) {
          setSessionError(data.message || 'Este enlace ya no es válido.');
        } else if (data.alreadyUploaded) {
          setSessionError('Las fotos de esta sesión ya se enviaron.');
        }
        setChecking(false);
      })
      .catch(() => {
        if (cancelled) return;
        setSessionError('No se pudo verificar el enlace. Revisa tu conexión.');
        setChecking(false);
      });

    return () => { cancelled = true; };
  }, [token]);

  const handleSend = async () => {
    if (!front) {
      setError('Falta la foto del frente del DUI.');
      return;
    }

    setSending(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('front', front);
      if (back) formData.append('back', back);

      const res = await fetch(`${API_URL}/users/dui-scan/capture/${token}`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || 'No se pudieron enviar las fotos.');
        return;
      }

      setSent(true);
    } catch (err) {
      console.error('Error al enviar las fotos:', err);
      setError('Error de conexión. Revisa tu señal e intenta de nuevo.');
    } finally {
      setSending(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-surfalt flex items-center justify-center p-6">
        <p className="text-sm text-muted">Verificando enlace...</p>
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className="min-h-screen bg-surfalt flex items-center justify-center p-6">
        <div className="bg-surface rounded-none border border-line p-6 max-w-sm text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-acsoft flex items-center justify-center text-ac">
            <FAIcon icon="triangle-exclamation" size="xl" />
          </div>
          <h1 className="font-display font-bold text-ink mb-1">Enlace no válido</h1>
          <p className="text-sm text-inkalt">{sessionError}</p>
          <p className="text-xs text-muted mt-3">
            Genera un código nuevo desde la computadora.
          </p>
        </div>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-surfalt flex items-center justify-center p-6">
        <div className="bg-surface rounded-none border border-line p-6 max-w-sm text-center">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-oksoft flex items-center justify-center text-ok">
            <FAIcon icon="check" size="2xl" />
          </div>
          <h1 className="font-display font-bold text-ink text-lg mb-1">¡Listo!</h1>
          <p className="text-sm text-inkalt">
            Las fotos ya llegaron a la computadora. Puedes volver a ella para continuar.
          </p>
          <p className="text-xs text-muted mt-4">Ya puedes cerrar esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surfalt p-4 sm:p-6">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-5">
          <h1 className="font-display font-bold text-ink text-xl mb-1">Foto del DUI</h1>
          <p className="text-sm text-inkalt">
            Toma las dos caras del documento. Cuida que se lean bien los datos.
          </p>
        </div>

        <div className="space-y-3 mb-5">
          <Slot
            label="Frente del DUI"
            hint="El lado con la foto y el número"
            file={front}
            onPick={setFront}
            onClear={() => setFront(null)}
          />
          <Slot
            label="Reverso del DUI"
            hint="El lado con la dirección"
            file={back}
            onPick={setBack}
            onClear={() => setBack(null)}
          />
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-acsoft border border-acline rounded-none text-sm text-ac">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleSend}
          disabled={!front || sending}
          className="w-full py-3.5 rounded-none bg-ac text-white font-display font-bold active:bg-ac transition-colors disabled:opacity-50"
        >
          {sending ? 'Enviando...' : 'Enviar fotos'}
        </button>

        <p className="text-[11px] text-muted text-center mt-3">
          Este enlace es temporal y solo sirve para enviar estas fotos.
        </p>
      </div>
    </div>
  );
}
