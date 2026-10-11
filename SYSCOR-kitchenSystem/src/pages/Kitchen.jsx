// pages/Kitchen.jsx
//
// La pantalla de cocina completa:
//   - Sin token de dispositivo: lobby con el código de emparejamiento. En este
//     estado no se pide ningún dato de comandas.
//   - Emparejada: tablero de comandas. Si el admin la desvincula o apaga el
//     sistema, el token se borra y vuelve sola al lobby.
import LoadingSpinner from '@syscor/web-shared/src/components/LoadingSpinner';
import useKitchenDevice from '../hooks/useKitchenDevice';
import useKitchenStatus from '../hooks/useKitchenStatus';
import KitchenLobby from '../components/kitchen/KitchenLobby';
import KitchenBoard from '../components/kitchen/KitchenBoard';

// Solo se monta con token: aquí empiezan las peticiones a la API de cocina
function PairedKitchen() {
  const { kitchen, loading, error, refetch } = useKitchenStatus();

  if (loading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-bg">
        <LoadingSpinner size="lg" color="gray" text="Conectando con la cocina..." />
      </div>
    );
  }

  if (!kitchen) return <KitchenLobby error={error} onRetry={refetch} />;

  return <KitchenBoard kitchen={kitchen} />;
}

export default function Kitchen() {
  const { isPaired } = useKitchenDevice();
  return isPaired ? <PairedKitchen /> : <KitchenLobby />;
}
