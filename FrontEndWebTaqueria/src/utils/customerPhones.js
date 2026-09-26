// Teléfonos de un cliente, en la forma que los guarda el backend.
//
// Desde que la app móvil deja elegir tipo y predeterminado, cada teléfono es
// { number, type, isDefault }; los clientes antiguos los tienen como texto
// plano. Aquí se unifican y se ordenan con el predeterminado primero.
export const PHONE_TYPE_LABELS = {
  mobile: 'Celular',
  landline: 'Fijo',
  work: 'Trabajo',
  other: 'Otro',
};

export const getClientPhones = (client) => {
  const list = (client?.personalInfo?.phones || [])
    .map((phone) =>
      typeof phone === 'string'
        ? { number: phone, type: 'mobile', isDefault: false }
        : { number: phone?.number || '', type: phone?.type || 'mobile', isDefault: !!phone?.isDefault },
    )
    .filter((phone) => phone.number);

  return [...list.filter((p) => p.isDefault), ...list.filter((p) => !p.isDefault)];
};

// El teléfono principal como texto, o '' si no tiene.
export const getPrimaryPhone = (client) => getClientPhones(client)[0]?.number || '';
