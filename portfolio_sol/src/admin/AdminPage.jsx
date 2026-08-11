import { useEffect, useMemo, useState } from "react";
import { DisplayHeading } from "../components/typography/DisplayHeading";
import { clientToAdminDraft, createEmptyAdminDraft } from "./adminDraft";
import { AboutEditor } from "./AboutEditor";
import { ClientEditor } from "./ClientEditor";
import { ClientOrderEditor } from "./ClientOrderEditor";
import { portfolioAdminService } from "./portfolioAdminService";
import "../styles/admin.css";

function useAdminRobotsMeta() {
  useEffect(() => {
    const previousTitle = document.title;
    let meta = document.querySelector('meta[name="robots"]');
    const created = !meta;
    const previousContent = meta?.getAttribute("content");
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "robots";
      document.head.append(meta);
    }
    meta.content = "noindex, nofollow";
    document.title = "Administración Portfolio";

    return () => {
      document.title = previousTitle;
      if (created) meta.remove();
      else if (previousContent) meta.content = previousContent;
    };
  }, []);
}

function Login({ error, loading, onSubmit }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <main className="admin-login">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(email, password);
        }}
      >
        <p className="admin-kicker">SF / PRIVADO</p>
        <DisplayHeading as="h1" text="Administración portfolio" />
        <label>
          Email
          <input
            autoComplete="username"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <label>
          Contraseña
          <input
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
        {error && <p className="admin-error" role="alert">{error}</p>}
        <button disabled={loading} type="submit">
          {loading ? "Iniciando sesión…" : "Iniciar sesión"}
        </button>
      </form>
    </main>
  );
}

function ClientPicker({ clients, emptyText, onBack, onSelect, title }) {
  return (
    <section className="admin-picker">
      <header>
        <DisplayHeading as="h1" text={title} />
        <button onClick={onBack} type="button">Volver</button>
      </header>
      {clients.length === 0 ? (
        <p>{emptyText}</p>
      ) : (
        <div className="admin-client-list">
          {clients.map((client) => (
            <button key={client.slug} onClick={() => onSelect(client)} type="button">
              <strong>{client.name}</strong>
              <span>{client.year} · {client.disciplines?.join(" / ")}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function DeleteClient({ client, onBack, onDeleted, service }) {
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const expected = client.name.toUpperCase();

  const remove = async () => {
    setLoading(true);
    setError("");
    try {
      await service.deleteClient(client);
      onDeleted();
    } catch (deleteError) {
      setError(deleteError.message);
      setLoading(false);
    }
  };

  return (
    <section className="admin-delete">
      <p className="admin-kicker">Confirmación destructiva</p>
      <DisplayHeading
        as="h1"
        text={`¿Seguro que querés eliminar ${client.name}?`}
      />
      <p>Se eliminarán sus datos y sus archivos del portfolio.</p>
      <label>
        Escribí <strong>{expected}</strong> para continuar
        <input
          autoComplete="off"
          onChange={(event) => setConfirmation(event.target.value)}
          value={confirmation}
        />
      </label>
      {error && <p className="admin-error" role="alert">{error}</p>}
      <div>
        <button disabled={loading} onClick={onBack} type="button">Cancelar</button>
        <button
          className="admin-danger"
          disabled={loading || confirmation !== expected}
          onClick={remove}
          type="button"
        >
          {loading ? "Eliminando…" : "Eliminar definitivamente"}
        </button>
      </div>
    </section>
  );
}

const dashboardActions = [
  { action: "create", number: "01", lines: ["Añadir", "nuevo", "cliente"] },
  { action: "pick-edit", number: "02", lines: ["Modificar", "cliente"] },
  { action: "pick-delete", number: "03", lines: ["Eliminar", "cliente"] },
  { action: "order", number: "04", lines: ["Ordenar", "clientes"] },
  { action: "about", number: "05", lines: ["Editar", "Sobre mí"] },
];

function DashboardAction({ action, lines, number, onAction }) {
  return (
    <button
      aria-label={`${number} ${lines.join(" ")}`}
      onClick={() => onAction(action)}
      type="button"
    >
      <span className="admin-dashboard__action-number">{number}</span>
      <strong className="admin-dashboard__action-title">
        {lines.map((line) => <span key={line}>{line}</span>)}
      </strong>
    </button>
  );
}

function Dashboard({ clients, onAction, onLogout }) {
  return (
    <main className="admin-dashboard">
      <header>
        <div>
          <p className="admin-kicker">SF / PORTFOLIO</p>
          <DisplayHeading as="h1" text="Panel administrativo" />
          <p>{clients.length} clientes disponibles</p>
        </div>
        <button onClick={onLogout} type="button">Cerrar sesión</button>
      </header>
      <div className="admin-dashboard__actions">
        {dashboardActions.map((dashboardAction) => (
          <DashboardAction
            {...dashboardAction}
            key={dashboardAction.number}
            onAction={onAction}
          />
        ))}
      </div>
    </main>
  );
}

export function AdminPage({ service = portfolioAdminService }) {
  useAdminRobotsMeta();
  const [phase, setPhase] = useState("checking");
  const [session, setSession] = useState(null);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [aboutContent, setAboutContent] = useState(null);
  const [aboutLoadError, setAboutLoadError] = useState("");

  const refreshClients = async () => {
    const nextClients = await service.listClients();
    setClients(nextClients);
  };

  const acceptSession = async (nextSession) => {
    if (!nextSession?.user) {
      setSession(null);
      setPhase("login");
      return;
    }

    const authorized = await service.isAdmin(nextSession.user.id);
    if (!authorized) {
      await service.signOut();
      setSession(null);
      setAuthError("La cuenta no está autorizada para administrar el portfolio.");
      setPhase("login");
      return;
    }

    setSession(nextSession);
    await refreshClients();
    setPhase("dashboard");
  };

  useEffect(() => {
    let active = true;
    service
      .getSession()
      .then((initialSession) => active && acceptSession(initialSession))
      .catch((error) => {
        if (active) {
          setAuthError(error.message);
          setPhase("login");
        }
      });
    const unsubscribe = service.onAuthStateChange((nextSession) => {
      if (active && nextSession?.user?.id !== session?.user?.id) {
        acceptSession(nextSession).catch((error) => {
          setAuthError(error.message);
          setPhase("login");
        });
      }
    });
    return () => {
      active = false;
      unsubscribe();
    };
    // Auth subscription must be installed once for this service instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service]);

  const login = async (email, password) => {
    setAuthLoading(true);
    setAuthError("");
    try {
      const nextSession = await service.signIn(email, password);
      await acceptSession(nextSession);
    } catch {
      setAuthError("Credenciales incorrectas");
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    await service.signOut();
    setSession(null);
    setClients([]);
    setPhase("login");
  };

  const returnToDashboard = async () => {
    await refreshClients();
    setSelectedClient(null);
    setPhase("dashboard");
  };

  const openAboutEditor = async () => {
    setPhase("about-loading");
    setAboutLoadError("");
    try {
      const content = await service.getAboutContent();
      setAboutContent(content);
      setPhase("about");
    } catch (error) {
      setAboutLoadError(error.message);
      setPhase("about-load-error");
    }
  };

  const editorDraft = useMemo(
    () =>
      phase === "create"
        ? createEmptyAdminDraft()
        : selectedClient
          ? clientToAdminDraft(selectedClient)
          : null,
    [phase, selectedClient],
  );

  if (phase === "checking") {
    return <main className="admin-checking">Verificando sesión…</main>;
  }
  if (!session || phase === "login") {
    return <Login error={authError} loading={authLoading} onSubmit={login} />;
  }
  if (phase === "dashboard") {
    return (
      <Dashboard
        clients={clients}
        onAction={(action) => {
          if (action === "about") openAboutEditor();
          else setPhase(action);
        }}
        onLogout={logout}
      />
    );
  }
  if (phase === "about-loading") {
    return <main className="admin-checking">Cargando Sobre mí…</main>;
  }
  if (phase === "order") {
    return (
      <ClientOrderEditor
        clients={clients}
        onBack={() => setPhase("dashboard")}
        onSaved={setClients}
        service={service}
      />
    );
  }
  if (phase === "about-load-error") {
    return (
      <section className="admin-delete">
        <DisplayHeading as="h1" text="No se pudo cargar Sobre mí" />
        <p className="admin-error" role="alert">{aboutLoadError}</p>
        <div>
          <button onClick={() => setPhase("dashboard")} type="button">Volver al panel</button>
          <button onClick={openAboutEditor} type="button">Reintentar</button>
        </div>
      </section>
    );
  }
  if (phase === "about" && aboutContent) {
    return (
      <AboutEditor
        initialContent={aboutContent}
        onCancel={() => setPhase("dashboard")}
        onSaved={returnToDashboard}
        service={service}
      />
    );
  }
  if (phase === "pick-edit" || phase === "pick-delete") {
    return (
      <ClientPicker
        clients={clients}
        emptyText="No hay clientes cargados."
        onBack={() => setPhase("dashboard")}
        onSelect={(client) => {
          setSelectedClient(client);
          setPhase(phase === "pick-edit" ? "edit" : "delete");
        }}
        title={phase === "pick-edit" ? "Modificar cliente" : "Eliminar cliente"}
      />
    );
  }
  if (phase === "delete" && selectedClient) {
    return (
      <DeleteClient
        client={selectedClient}
        onBack={() => setPhase("pick-delete")}
        onDeleted={returnToDashboard}
        service={service}
      />
    );
  }
  if ((phase === "create" || phase === "edit") && editorDraft) {
    return (
      <ClientEditor
        initialDraft={editorDraft}
        mode={phase}
        onCancel={() => setPhase("dashboard")}
        onSaved={returnToDashboard}
        service={service}
      />
    );
  }

  return null;
}
