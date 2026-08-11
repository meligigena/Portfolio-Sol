import { lazy, Suspense } from "react";
import {
  createBrowserRouter,
  createMemoryRouter,
  Navigate,
} from "react-router-dom";
import { App } from "./App";
import { HomePage } from "../pages/HomePage";
import { NotFoundPage } from "../pages/NotFoundPage";

const ClientPage = lazy(() =>
  import("../pages/ClientPage").then((module) => ({
    default: module.ClientPage,
  })),
);

const AdminPage = lazy(() =>
  import("../admin/AdminPage").then((module) => ({
    default: module.AdminPage,
  })),
);

function ClientRoute() {
  return (
    <Suspense fallback={<p className="route-loading">Cargando proyecto…</p>}>
      <ClientPage />
    </Suspense>
  );
}

function AdminRoute() {
  return (
    <Suspense fallback={<main className="admin-checking">Verificando sesión…</main>}>
      <AdminPage />
    </Suspense>
  );
}

export const routes = [
  {
    path: "/admin",
    element: <AdminRoute />,
  },
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "portfolio/:clientSlug", element: <ClientRoute /> },
      { path: "portfolio", element: <Navigate to="/#portfolio" replace /> },
      { path: "sobre-mi", element: <Navigate to="/#sobre-mi" replace /> },
      { path: "contacto", element: <Navigate to="/#contacto" replace /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];

export function createAppRouter(initialEntries) {
  if (initialEntries) {
    return createMemoryRouter(routes, { initialEntries });
  }

  return createBrowserRouter(routes);
}
