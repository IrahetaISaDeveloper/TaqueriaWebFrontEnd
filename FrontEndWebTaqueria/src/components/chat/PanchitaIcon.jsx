// Imagen de Chef Panchita.
//
// Las imágenes se sirven desde Cloudinary, no desde el repo: así se pueden
// cambiar sin volver a desplegar el frontend.
//
// Hay dos versiones de cada pieza —una por tema— porque el trazo está
// dibujado en un color fijo y no se puede recolorear con CSS. Vive en un
// componente propio para que la elección del archivo ocurra en un solo
// sitio: el botón del login, el encabezado del chat y cada mensaje suyo la
// usan sin repetir la lógica.
//
// - "icon"     → retrato cuadrado, para el botón y el encabezado.
// - "avatar"   → figura de línea, mientras está escribiendo la respuesta.
// - "answered" → retrato realista, cuando ya terminó de responder. Es el
//                mismo en los dos temas, por eso no se ramifica.
import { useTheme } from '../../context/themeContext';

const CLOUD = 'https://res.cloudinary.com/ddisnfuwo/image/upload';

const SOURCES = {
  icon: {
    light: `${CLOUD}/v1789535451/panchita-icono-medio-claro-256.png`,
    dark: `${CLOUD}/v1789535305/panchita-icono-medio-solo-linea-blanca.png`,
  },
  avatar: {
    light: `${CLOUD}/v1789535462/panchita-claro-rojo.png`,
    dark: `${CLOUD}/v1789535423/panchita-11a-linea-acento.png`,
  },
  answered: {
    light: `${CLOUD}/v1789536804/PanchitaRealistaClaro.png`,
    dark: `${CLOUD}/v1789536804/PanchitaRealistaClaro.png`,
  },
};

const PanchitaIcon = ({ variant = 'icon', className = '' }) => {
  const { theme } = useTheme();
  const set = SOURCES[variant] || SOURCES.icon;
  const src = set[theme === 'dark' ? 'dark' : 'light'];

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={`object-contain shrink-0 ${className}`}
    />
  );
};

export default PanchitaIcon;
