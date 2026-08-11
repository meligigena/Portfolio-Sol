import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <main id="main-content" className="not-found">
      <p>ERROR 404</p>
      <h1>Página no encontrada</h1>
      <Link to="/#portfolio">Volver a Portfolio</Link>
    </main>
  );
}
