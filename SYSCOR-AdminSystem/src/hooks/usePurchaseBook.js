import { useState, useEffect, useCallback } from 'react';
import { getCurrentPeriod } from './usePayroll';

const API_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Libro de Compras del período. El backend arma las filas (correlativo,
 * columnas del anexo y avisos de datos faltantes) a partir de las facturas
 * de compra: aquí solo se consulta y se corrige.
 */
export default function usePurchaseBook(initialPeriod = getCurrentPeriod()) {
  const [period, setPeriod] = useState(initialPeriod);
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBook = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/purchase-invoices/purchase-book?period=${period}`, {
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'No se pudo cargar el libro de compras');
      setBook(data);
    } catch (err) {
      setError(err.message);
      setBook(null);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchBook();
  }, [fetchBook]);

  // Trae la factura completa para abrirla en el formulario de edición.
  const fetchInvoice = useCallback(async (id) => {
    try {
      const res = await fetch(`${API_URL}/purchase-invoices?period=${period}`, { credentials: 'include' });
      if (!res.ok) return null;
      const list = await res.json();
      return list.find((inv) => inv._id === id) || null;
    } catch {
      return null;
    }
  }, [period]);

  // Registro y edición van como FormData porque pueden llevar el comprobante.
  const saveInvoice = async (formValues, file, id = null) => {
    try {
      const formData = new FormData();
      Object.entries(formValues).forEach(([key, value]) => {
        // En la edición se mandan también los vacíos, para poder borrar un
        // dato (ej. una serie mal escrita); en el registro no hace falta.
        if (value === null || value === undefined) return;
        if (!id && value === '') return;
        formData.append(key, value);
      });
      if (file) formData.append('file', file);

      const res = await fetch(`${API_URL}/purchase-invoices${id ? `/${id}` : ''}`, {
        method: id ? 'PUT' : 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, message: data.message || 'No se pudo guardar la factura' };
      }

      await fetchBook();
      return { success: true, message: data.message };
    } catch (err) {
      console.error('Error al guardar la factura de compra:', err);
      return { success: false, message: 'Error de conexión al guardar la factura' };
    }
  };

  return {
    book,
    rows: book?.rows || [],
    totals: book?.totals || null,
    loading,
    error,
    period,
    setPeriod,
    fetchInvoice,
    saveInvoice,
    refetch: fetchBook,
  };
}
