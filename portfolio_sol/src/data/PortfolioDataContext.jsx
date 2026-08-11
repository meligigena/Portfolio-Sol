/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { clients as fallbackClients } from "./clients";
import { fetchPublishedPortfolioClients } from "./portfolioDatabase";
import { fetchAboutContent } from "./siteContent";

const PortfolioDataContext = createContext({
  clients: fallbackClients,
  aboutContent: null,
  aboutStatus: "loading",
  source: "fallback",
});

export function PortfolioDataProvider({ children }) {
  const [state, setState] = useState({
    clients: fallbackClients,
    aboutContent: null,
    aboutStatus: "loading",
    source: "fallback",
  });

  useEffect(() => {
    const databaseEnabled =
      import.meta.env.VITE_PORTFOLIO_DATABASE_ENABLED === "true";
    if (import.meta.env.MODE === "test") return undefined;

    let active = true;
    if (databaseEnabled) {
      fetchPublishedPortfolioClients()
        .then((databaseClients) => {
          if (active && databaseClients.length > 0) {
            setState((current) => ({
              ...current,
              clients: databaseClients,
              source: "database",
            }));
          }
        })
        .catch((error) => {
          console.error("No se pudo cargar el portfolio desde Supabase.", error);
        });
    }

    fetchAboutContent()
      .then((aboutContent) => {
        if (active) {
          setState((current) => ({
            ...current,
            aboutContent,
            aboutStatus: "ready",
          }));
        }
      })
      .catch((error) => {
        if (active) {
          setState((current) => ({ ...current, aboutStatus: "error" }));
        }
        console.error("No se pudo cargar Sobre mí desde Supabase.", error);
      });

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(() => state, [state]);
  return (
    <PortfolioDataContext.Provider value={value}>
      {children}
    </PortfolioDataContext.Provider>
  );
}

export function usePortfolioData() {
  return useContext(PortfolioDataContext);
}
