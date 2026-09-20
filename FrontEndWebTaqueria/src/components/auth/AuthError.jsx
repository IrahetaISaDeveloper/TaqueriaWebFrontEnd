// Aviso de error de la API en las pantallas de autenticación. El backend
// devuelve a veces un objeto { title, message } y otras una cadena suelta,
// así que aquí se cubren ambos casos en un solo sitio.
const AuthError = ({ error }) => {
  if (!error) return null;

  return (
    <div className="border border-acline bg-acsoft p-3">
      {typeof error === 'object' ? (
        <>
          <p className="text-[13px] font-medium text-ac">{error.title}</p>
          {error.message && <p className="text-xs text-ac mt-0.5">{error.message}</p>}
        </>
      ) : (
        <p className="text-[13px] text-ac whitespace-pre-line">{error}</p>
      )}
    </div>
  );
};

export default AuthError;
