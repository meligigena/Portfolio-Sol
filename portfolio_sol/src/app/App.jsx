import { Outlet, ScrollRestoration } from "react-router-dom";
import { ScrollToHash } from "../components/navigation/ScrollToHash";
import { PortfolioDataProvider } from "../data/PortfolioDataContext";

export function App() {
  return (
    <PortfolioDataProvider>
      <a className="skip-link" href="#main-content">
        Saltar al contenido
      </a>
      <ScrollToHash />
      <Outlet />
      <ScrollRestoration />
    </PortfolioDataProvider>
  );
}
