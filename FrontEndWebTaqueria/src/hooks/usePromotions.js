import { useState, useEffect, useCallback } from 'react';

const BASE = import.meta.env.VITE_API_URL || '/api';
const API_URL = `${BASE}/menu/promotions`;
const AI_URL = `${BASE}/ai/suggest-promotion`;

/**
 * Hook 'usePromotions'
 *
 * Las promociones del día combinan productos que ya existen en el menú a un
 * precio especial y con una vigencia corta (máximo 3 días; el backend rechaza
 * cualquier cosa más larga).
 *
 * El precio "normal" de lo que incluye la promo NO se calcula aquí: lo hace el
 * backend contra los precios vigentes de cada producto, tanto al guardar como
 * en el endpoint /preview que alimenta el "antes/ahora" del modal.
 */
export default function usePromotions() {
	const [promotions, setPromotions] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	const fetchPromotions = useCallback(async () => {
		setLoading(true);
		try {
			const response = await fetch(API_URL, { credentials: 'include' });
			if (!response.ok) throw new Error('Error al obtener las promociones');
			setPromotions(await response.json());
			setError(null);
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchPromotions();
	}, [fetchPromotions]);

	// Crear y actualizar reciben FormData porque la promoción puede llevar imagen
	const addPromotion = async (formData) => {
		try {
			const response = await fetch(API_URL, { method: 'POST', credentials: 'include', body: formData });
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Error al guardar la promoción');
			}
			await fetchPromotions();
			return { success: true };
		} catch (err) {
			return { success: false, message: err.message };
		}
	};

	const updatePromotion = async (id, formData) => {
		try {
			const response = await fetch(`${API_URL}/${id}`, { method: 'PUT', credentials: 'include', body: formData });
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Error al actualizar la promoción');
			}
			await fetchPromotions();
			return { success: true };
		} catch (err) {
			return { success: false, message: err.message };
		}
	};

	const deletePromotion = async (id) => {
		try {
			const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE', credentials: 'include' });
			if (!response.ok) throw new Error('Error al eliminar la promoción');
			setPromotions((prev) => prev.filter((p) => p._id !== id));
			return { success: true };
		} catch (err) {
			return { success: false, message: err.message };
		}
	};

	// Pausar/reactivar sin reenviar toda la promoción. El backend se niega a
	// reactivar una cuya vigencia ya venció, y devuelve el porqué.
	const setStatus = async (id, status) => {
		try {
			const response = await fetch(`${API_URL}/${id}/status`, {
				method: 'PATCH',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status }),
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.message || 'No se pudo cambiar el estado');
			await fetchPromotions();
			return { success: true };
		} catch (err) {
			return { success: false, message: err.message };
		}
	};

	/**
	 * Cuánto costaría comprar suelto lo que se lleva armado, para mostrar el
	 * ahorro en vivo mientras el admin agrega productos. Devuelve null si algo
	 * falla: es información de apoyo, no puede bloquear el formulario.
	 */
	const previewPricing = useCallback(async (items, price) => {
		try {
			const response = await fetch(`${API_URL}/preview`, {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ items, price }),
			});
			if (!response.ok) return null;
			return await response.json();
		} catch {
			return null;
		}
	}, []);

	// Sugerencias de la IA. Igual que el resto de asistencias del sistema, si
	// no responde se devuelve una lista vacía y el admin arma la promo a mano.
	const suggestPromotions = useCallback(async (idea, maxSuggestions = 3) => {
		try {
			const response = await fetch(AI_URL, {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ idea, maxSuggestions }),
			});
			if (!response.ok) return [];
			const data = await response.json();
			return Array.isArray(data.suggestions) ? data.suggestions : [];
		} catch {
			return [];
		}
	}, []);

	const checkName = async (name) => {
		try {
			const res = await fetch(`${API_URL}/check-name?name=${encodeURIComponent(name)}`, {
				credentials: 'include',
			});
			if (!res.ok) return null;
			const data = await res.json();
			return data.existing || null;
		} catch {
			return null;
		}
	};

	return {
		promotions,
		loading,
		error,
		addPromotion,
		updatePromotion,
		deletePromotion,
		setStatus,
		previewPricing,
		suggestPromotions,
		checkName,
		refresh: fetchPromotions,
	};
}
