import { useRef, useState } from "react";
import { DisplayHeading } from "../components/typography/DisplayHeading";
import { moveClient } from "../data/clientOrder";

export function ClientOrderEditor({ clients, onBack, onSaved, service }) {
  const [orderedClients, setOrderedClients] = useState(() => [...clients]);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const draggedClientId = useRef(null);

  const moveByIndex = (fromIndex, toIndex) => {
    setOrderedClients((current) => moveClient(current, fromIndex, toIndex));
    setStatus("");
  };

  const moveDraggedClient = (targetClientId) => {
    const draggedId = draggedClientId.current;
    if (!draggedId || draggedId === targetClientId) return;

    setOrderedClients((current) => {
      const fromIndex = current.findIndex((client) => client.id === draggedId);
      const toIndex = current.findIndex((client) => client.id === targetClientId);
      return moveClient(current, fromIndex, toIndex);
    });
    setStatus("");
  };

  const save = async () => {
    setSaving(true);
    setError("");
    setStatus("");
    try {
      await service.saveClientOrder(orderedClients.map((client) => client.id));
      const savedClients = orderedClients.map((client, index) => ({
        ...client,
        sortOrder: index,
      }));
      setOrderedClients(savedClients);
      setStatus("Orden guardado correctamente");
      onSaved(savedClients);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="admin-order">
      <header>
        <div>
          <p className="admin-kicker">SF / PORTFOLIO</p>
          <DisplayHeading as="h1" text="Ordenar clientes" />
          <p>Arrastrá las filas o usá los controles para definir el orden público.</p>
        </div>
        <button disabled={saving} onClick={onBack} type="button">Volver</button>
      </header>

      <div className="admin-order__list" role="list">
        {orderedClients.map((client, index) => (
          <div
            className="admin-order__row"
            data-testid="client-order-row"
            draggable
            key={client.id}
            onDragEnd={() => {
              draggedClientId.current = null;
            }}
            onDragEnter={() => moveDraggedClient(client.id)}
            onDragOver={(event) => event.preventDefault()}
            onDragStart={(event) => {
              draggedClientId.current = client.id;
              event.dataTransfer?.setData("text/plain", client.id);
              if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
            }}
            onDrop={(event) => {
              event.preventDefault();
              draggedClientId.current = null;
            }}
            role="listitem"
          >
            <span className="admin-order__handle" aria-hidden="true">☰</span>
            <span
              className="admin-order__position"
              data-testid="client-order-position"
              aria-label={`Posición ${index + 1}`}
            >
              {index + 1}
            </span>
            <span className="admin-order__client">
              <strong data-testid="client-order-name">{client.name}</strong>
              {client.year && <small>{client.year}</small>}
            </span>
            <span className="admin-order__controls">
              <button
                aria-label={`Mover ${client.name} hacia arriba`}
                disabled={saving || index === 0}
                onClick={() => moveByIndex(index, index - 1)}
                type="button"
              >
                ↑
              </button>
              <button
                aria-label={`Mover ${client.name} hacia abajo`}
                disabled={saving || index === orderedClients.length - 1}
                onClick={() => moveByIndex(index, index + 1)}
                type="button"
              >
                ↓
              </button>
            </span>
          </div>
        ))}
      </div>

      {error && <p className="admin-error" role="alert">{error}</p>}
      {status && <p className="admin-order__status" role="status">{status}</p>}
      <button
        className="admin-confirm"
        disabled={saving || orderedClients.length === 0}
        onClick={save}
        type="button"
      >
        {saving ? "Guardando…" : "Guardar orden"}
      </button>
    </main>
  );
}
