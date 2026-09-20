import React from 'react'

// Iconos del sistema. El rediseño cambió Font Awesome por Phosphor, pero el
// resto del código sigue pidiendo los iconos por su nombre de Font Awesome
// ("trash", "user-plus"...) en unas 500 llamadas repartidas por todo el
// proyecto. En vez de reescribir cada una, la traducción vive aquí: este
// componente es el único punto por el que pasan todos los iconos.
//
// Si un nombre no está en el mapa se usa tal cual (muchos coinciden entre
// ambas familias) y, de no existir, Phosphor no pinta nada — nunca rompe la
// pantalla.
const PHOSPHOR_BY_FA_NAME = {
  // Acciones
  'trash': 'trash', 'trash-alt': 'trash', 'edit': 'pencil-simple', 'pen': 'pencil-simple',
  'plus': 'plus', 'plus-circle': 'plus-circle', 'times': 'x', 'xmark': 'x',
  'times-circle': 'x-circle', 'check': 'check', 'check-circle': 'check-circle',
  'circle-check': 'check-circle', 'check-double': 'checks', 'ban': 'prohibit',
  'eye': 'eye', 'eye-slash': 'eye-slash', 'magnifying-glass': 'magnifying-glass',
  'magnifying-glass-plus': 'magnifying-glass-plus',
  'magnifying-glass-minus': 'magnifying-glass-minus',
  'floppy-disk': 'floppy-disk', 'paper-plane': 'paper-plane-tilt',
  'paperclip': 'paperclip', 'scissors': 'scissors', 'qrcode': 'qr-code',
  'rotate-left': 'arrow-counter-clockwise', 'rotate-right': 'arrow-clockwise',
  'sign-out-alt': 'sign-out', 'camera': 'camera', 'key': 'key', 'lock': 'lock',
  'spinner': 'circle-notch', 'ellipsis-vertical': 'dots-three-vertical',

  // Flechas y navegación
  'chevron-left': 'caret-left', 'chevron-right': 'caret-right',
  'chevron-down': 'caret-down', 'chevron-up': 'caret-up',
  'arrow-right': 'arrow-right', 'bars': 'list', 'bars-staggered': 'list',
  'list': 'list', 'list-check': 'list-checks', 'layer-group': 'stack',

  // Avisos y estados
  'triangle-exclamation': 'warning', 'exclamation-triangle': 'warning',
  'circle-exclamation': 'warning-circle', 'exclamation-circle': 'warning-circle',
  'circle-info': 'info', 'bell': 'bell', 'bell-slash': 'bell-slash',
  'bolt': 'lightning', 'star': 'star', 'trophy': 'trophy', 'face-smile': 'smiley',
  'shield-alt': 'shield-check', 'clock': 'clock', 'calendar': 'calendar-blank',
  'calendar-clock': 'calendar-check', 'inbox': 'tray',

  // Personas
  'user': 'user', 'users': 'users', 'user-plus': 'user-plus',
  'user-tie': 'user-circle', 'user-group': 'users-three',
  'user-check': 'user-check', 'user-slash': 'user-minus', 'user-lock': 'user-focus',
  'id-card': 'identification-card',

  // Dinero y documentos
  'dollar-sign': 'currency-dollar', 'money-bill': 'money', 'money-bill-wave': 'money',
  'sack-dollar': 'money', 'hand-holding-dollar': 'hand-coins', 'hand-holding': 'hand-coins',
  'credit-card': 'credit-card', 'percentage': 'percent', 'receipt': 'receipt',
  'file-invoice-dollar': 'receipt', 'file-pdf': 'file-pdf', 'file-code': 'file-code',
  'file-arrow-down': 'file-arrow-down', 'file-arrow-up': 'file-arrow-up',
  'file-circle-check': 'file-text', 'chart-line': 'chart-line',
  'chart-pie': 'chart-pie-slice', 'briefcase': 'briefcase',

  // Local, menú e inventario
  'utensils': 'fork-knife', 'wine-glass': 'wine', 'chair': 'armchair',
  'couch': 'armchair', 'store': 'storefront', 'box': 'package', 'tag': 'tag',
  'gift': 'gift', 'shopping-bag': 'shopping-bag', 'truck': 'truck',
  'motorcycle': 'motorcycle', 'flask': 'flask', 'feather': 'feather',

  // Contacto y ubicación
  'envelope': 'envelope-simple', 'phone': 'phone',
  'location-dot': 'map-pin', 'map-marker-alt': 'map-pin', 'map-signs': 'signpost',
  'globe': 'globe-hemisphere-west', 'mobile-screen': 'device-mobile',
  'image': 'image',

  // Ajustes y varios
  'cog': 'gear', 'sliders': 'sliders-horizontal', 'sun': 'sun', 'moon': 'moon',
  'robot': 'robot', 'wand-magic-sparkles': 'magic-wand',
}

const SIZE_CLASSES = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
}

const FAIcon = ({ icon, className = '', size = 'base', weight = 'regular' }) => {
  const name = PHOSPHOR_BY_FA_NAME[icon] || icon
  // Phosphor expone cada grosor como su propia familia: "ph" es el regular y
  // "ph-fill" el relleno, que se usa para los estados activos.
  const family = weight === 'fill' ? 'ph-fill' : 'ph'

  return <i className={`${family} ph-${name} ${SIZE_CLASSES[size] || SIZE_CLASSES.base} ${className}`} />
}

export default FAIcon
