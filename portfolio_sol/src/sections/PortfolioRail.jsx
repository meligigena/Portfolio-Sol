import { Link } from "react-router-dom";
import { usePortfolioRail } from "../animations/usePortfolioRail";
import { NetworkTitle } from "../components/typography/NetworkTitle";
import { usePortfolioData } from "../data/PortfolioDataContext";
import { portfolioMediaUrl } from "../lib/portfolioMedia";

export function PortfolioRail() {
  const { clients } = usePortfolioData();
  const {
    sectionRef,
    viewportRef,
    trackRef,
    activeIndexRef,
  } = usePortfolioRail(clients.length);

  return (
    <section
      ref={sectionRef}
      className="portfolio-rail"
      id="portfolio"
      aria-labelledby="portfolio-title"
      data-active-index="0"
    >
      <div ref={viewportRef} className="portfolio-rail__viewport">
        <header className="portfolio-rail__header">
          <span className="portfolio-rail__divider" data-section-divider aria-hidden="true" />
          <p className="portfolio-rail__kicker">SELECCIÓN DE TRABAJOS</p>
          <NetworkTitle id="portfolio-title" text="MIS TRABAJOS" />
          <p className="portfolio-rail__instruction">
            SCROLL PARA EXPLORAR <span aria-hidden="true">→</span>
          </p>
        </header>

        <div className="portfolio-rail__stage">
          <div ref={trackRef} className="portfolio-rail__track">
            {clients.map((client) => (
              <article
                className="client-card"
                data-client-card
                key={client.slug}
              >
                <Link
                  className="client-card__link"
                  to={`/portfolio/${client.slug}`}
                  aria-label={client.name}
                >
                  <div
                    className={`client-card__preview${client.cover ? " client-card__preview--asset" : ""}`}
                    aria-hidden="true"
                  >
                    {client.cover ? (
                      <img
                        src={portfolioMediaUrl(client.cover)}
                        alt=""
                        width="1080"
                        height="1350"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : null}
                  </div>
                  <div className="client-card__meta">
                    <h3>{client.name}</h3>
                    {client.year && <p>{client.year}</p>}
                    {client.disciplines?.length > 0 && (
                      <p>{client.disciplines.join(" / ")}</p>
                    )}
                  </div>
                </Link>
              </article>
            ))}
          </div>

        </div>

        <footer className="portfolio-rail__counter" aria-hidden="true">
          <span ref={activeIndexRef}>01</span>
          <span className="portfolio-rail__counter-line" />
          <span>{String(clients.length).padStart(2, "0")}</span>
        </footer>
      </div>
    </section>
  );
}
