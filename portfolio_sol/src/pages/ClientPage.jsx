import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useCaseStudyMotion } from "../animations/useCaseStudyMotion";
import { ProjectMedia } from "../components/media/ProjectMedia";
import { PortfolioFooter } from "../components/PortfolioFooter";
import { NetworkTitle } from "../components/typography/NetworkTitle";
import { usePortfolioData } from "../data/PortfolioDataContext";
import {
  hasRenderableContentBlock,
  hasRenderableEditionContent,
  hasRenderableProjectContent,
} from "../data/projectContent";
import { NotFoundPage } from "./NotFoundPage";
import { getAdjacentClients } from "../data/clientOrder";
import { combinePhoneSections } from "./phoneSectionLayout";
import {
  PublicContentBlock,
  SequenceSection,
} from "../sections/PublicContentBlock";

export function ClientPage() {
  const { clientSlug } = useParams();
  const { clients } = usePortfolioData();
  const client = clients.find((item) => item.slug === clientSlug);

  if (!client) {
    return <NotFoundPage />;
  }

  return <ClientCaseStudy client={client} clients={clients} key={client.slug} />;
}

function ClientCaseStudy({ client, clients }) {
  const pageRef = useCaseStudyMotion(client.slug);
  const hasProjectContent = hasRenderableProjectContent(client);
  const isMultilineTitle = client.slug === "sistemas-moviles";
  const [activeEditionId, setActiveEditionId] = useState(
    client.editions?.[0]?.id ?? null,
  );
  const activeEdition = client.editions?.find(
    (edition) => edition.id === activeEditionId,
  );
  const { previousClient, nextClient } = getAdjacentClients(clients, client.slug);

  return (
    <>
      <main ref={pageRef} id="main-content" className="case-study">
      <nav className="case-study__nav" aria-label="Navegación del proyecto">
        <Link className="case-study__back-link" to="/#portfolio">
          ← Volver al portfolio
        </Link>
        <Link to="/#contacto">Contacto</Link>
      </nav>

      <header className="case-study__intro">
        <NetworkTitle
          as="h1"
          className={isMultilineTitle ? "case-study__intro-title--multiline" : ""}
          text={client.name}
        />
        {(client.disciplines?.length > 0 || client.year) && (
          <div className="case-study__intro-meta">
            {client.disciplines?.length > 0 && <p>{client.disciplines.join(" / ")}</p>}
            {client.year && <p>{client.year}</p>}
          </div>
        )}
      </header>

      {client.editions && (
        <EditionSelector
          activeEditionId={activeEditionId}
          clientName={client.name}
          clientSlug={client.slug}
          editions={client.editions}
          onSelect={setActiveEditionId}
        />
      )}

      <div className="case-study__body">
        <div
          className="case-study__media"
          id={activeEdition ? `${client.slug}-${activeEdition.id}-panel` : undefined}
          role={activeEdition ? "tabpanel" : undefined}
          aria-labelledby={activeEdition ? `${client.slug}-${activeEdition.id}-tab` : undefined}
        >
          {!hasProjectContent ? (
            <p className="case-study__coming-soon">Próximamente</p>
          ) : activeEdition ? (
            <EditionContent edition={activeEdition} />
          ) : client.content ? (
            <ContentBlocks blocks={client.content} />
          ) : (
            <LegacyContent projects={client.projects ?? []} />
          )}
        </div>
      </div>

      <nav className="case-study__pagination" aria-label="Otros proyectos">
        <Link to={`/portfolio/${previousClient.slug}`}>
          <span className="case-study__pagination-label">Cliente anterior</span>
          <span className="case-study__pagination-name">{previousClient.name}</span>
        </Link>
        <Link to={`/portfolio/${nextClient.slug}`}>
          <span className="case-study__pagination-label">Cliente siguiente</span>
          <span className="case-study__pagination-name">{nextClient.name}</span>
        </Link>
      </nav>
      </main>
      <PortfolioFooter />
    </>
  );
}

function ContentBlocks({ blocks = [] }) {
  return combinePhoneSections(blocks).map((block, blockIndex) => (
    <PublicContentBlock
      block={block}
      blockIndex={blockIndex}
      key={block.id ?? `${block.type}-${blockIndex}`}
    />
  ));
}

function LegacyContent({ projects }) {
  const renderableProjects = projects.filter(hasRenderableContentBlock);
  const stories = renderableProjects.filter((project) => project.type === "story");
  const remainingProjects = renderableProjects.filter(
    (project) => project.type !== "story",
  );

  return (
    <>
      {stories.length > 0 && (
        <SequenceSection
          block={{ eyebrow: "INSTAGRAM", title: "Stories" }}
          className="case-study__stories"
          titleId="stories-title"
        >
          <div className="case-study__story-flow">
            {stories.map((project, index) => (
              <ProjectMedia project={project} index={index} key={project.id} />
            ))}
          </div>
        </SequenceSection>
      )}
      {remainingProjects.map((project, index) => (
        <ProjectMedia project={project} index={index} key={project.id} />
      ))}
    </>
  );
}

function EditionSelector({ activeEditionId, clientName, clientSlug, editions, onSelect }) {
  return (
    <div className="case-study__editions">
      <div className="case-study__edition-tabs" role="tablist" aria-label={`Ediciones de ${clientName}`}>
        {editions.map((edition) => {
          const isActive = edition.id === activeEditionId;

          return (
            <button
              aria-controls={`${clientSlug}-${edition.id}-panel`}
              aria-selected={isActive}
              className="case-study__edition-tab"
              id={`${clientSlug}-${edition.id}-tab`}
              key={edition.id}
              onClick={() => onSelect(edition.id)}
              role="tab"
              type="button"
            >
              {edition.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EditionContent({ edition }) {
  if (!hasRenderableEditionContent(edition)) {
    return <p className="case-study__coming-soon">Próximamente</p>;
  }

  return <ContentBlocks blocks={edition.content} />;
}
