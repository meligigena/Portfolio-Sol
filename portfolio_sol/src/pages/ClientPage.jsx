import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useCaseStudyMotion } from "../animations/useCaseStudyMotion";
import { CarouselPairs } from "../components/media/CarouselPairs";
import { CatalogPair } from "../components/media/CatalogPair";
import { MediaRows } from "../components/media/MediaRows";
import { ProjectMedia } from "../components/media/ProjectMedia";
import { ResponsiveBrandBanner } from "../components/media/ResponsiveBrandBanner";
import { StorySequence } from "../components/media/StorySequence";
import { VideoStack } from "../components/media/VideoStack";
import { DisplayHeading } from "../components/typography/DisplayHeading";
import { NetworkTitle } from "../components/typography/NetworkTitle";
import { usePortfolioData } from "../data/PortfolioDataContext";
import {
  hasRenderableContentBlock,
  hasRenderableEditionContent,
  hasRenderableProjectContent,
} from "../data/projectContent";
import { NotFoundPage } from "./NotFoundPage";
import { getAdjacentClients } from "../data/clientOrder";

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
  );
}

function ContentBlocks({ blocks = [] }) {
  return blocks.filter(hasRenderableContentBlock).map((block, blockIndex) => (
    <ContentBlock block={block} blockIndex={blockIndex} key={block.id ?? `${block.type}-${blockIndex}`} />
  ));
}

function ContentBlock({ block, blockIndex }) {
  const titleId = `${block.type}-${blockIndex}`;

  if (block.type === "storySequence") {
    const storyItems = block.items ?? [];
    const hasRealStories = storyItems.some((item) => item.src);
    const hasStoryPresentation =
      hasRealStories || Boolean(block.companionVideo?.src);

    return (
      <SequenceSection block={block} className="case-study__stories" titleId={titleId}>
        {hasStoryPresentation ? (
          <StorySequence
            companionVideo={block.companionVideo}
            presentation={block.presentation}
            projects={storyItems}
          />
        ) : (
          <div className="case-study__story-flow">
            {storyItems.map((project, index) => (
              <ProjectMedia project={project} index={index} key={project.id} />
            ))}
          </div>
        )}
      </SequenceSection>
    );
  }

  if (block.type === "postGrid") {
    const postPairs = Array.from(
      { length: Math.ceil(block.items.length / 2) },
      (_, pairIndex) => block.items.slice(pairIndex * 2, pairIndex * 2 + 2),
    );

    return (
      <SequenceSection block={block} className="case-study__posts" titleId={titleId}>
        <div className="case-study__feed">
          {postPairs.map((pair, pairIndex) => (
            <div
              className={`case-study__post-pair${pair.length === 1 ? " is-single" : ""}`}
              data-feed-block="postPair"
              data-post-pair
              key={pair.map((project) => project.id).join("-")}
            >
              {pair.map((project, itemIndex) => (
                <ProjectMedia
                  project={project}
                  index={pairIndex * 2 + itemIndex}
                  key={project.id}
                />
              ))}
            </div>
          ))}
        </div>
      </SequenceSection>
    );
  }

  if (block.type === "carouselPairs") {
    return (
      <SequenceSection block={block} className="case-study__carousels" titleId={titleId}>
        <CarouselPairs items={block.items} />
      </SequenceSection>
    );
  }

  if (block.type === "videoStack") {
    return (
      <SequenceSection block={block} className="case-study__videos" titleId={titleId}>
        <VideoStack items={block.items} />
      </SequenceSection>
    );
  }

  if (block.type === "catalogPair") {
    return (
      <SequenceSection block={block} className="case-study__catalogs" titleId={titleId}>
        <CatalogPair items={block.items} />
      </SequenceSection>
    );
  }

  if (block.type === "mediaRows") {
    return (
      <SequenceSection
        block={block}
        className="case-study__posts case-study__strip-posts"
        titleId={titleId}
      >
        <MediaRows rows={block.rows} />
      </SequenceSection>
    );
  }

  if (block.type === "banners") {
    return (
      <SequenceSection
        block={block}
        className="case-study__custom-media"
        titleId={titleId}
      >
        <ResponsiveBrandBanner
          items={block.items}
          presentation={block.presentation}
        />
      </SequenceSection>
    );
  }

  if (block.type === "customMedia") {
    const hasResponsivePair =
      block.presentation === "responsiveBanner" &&
      block.items.some((item) => item.viewport === "desktop") &&
      block.items.some((item) => item.viewport === "mobile");

    return (
      <SequenceSection
        block={block}
        className="case-study__custom-media"
        titleId={titleId}
      >
        {hasResponsivePair ? (
          <ResponsiveBrandBanner
            items={block.items}
            presentation={block.presentation}
          />
        ) : (
          <div className="case-study__custom-media-grid">
            {block.items.map((project, index) => (
              <ProjectMedia project={project} index={index} key={project.id} />
            ))}
          </div>
        )}
      </SequenceSection>
    );
  }

  return null;
}

function SequenceSection({ block, children, className, titleId }) {
  return (
    <section
      className={`case-study__sequence ${className}`}
      aria-labelledby={titleId}
    >
      <SequenceHeader block={block} titleId={titleId} />
      {children}
    </section>
  );
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

function SequenceHeader({ block, titleId }) {
  return (
    <header className="case-study__sequence-header">
      <DisplayHeading
        as="h2"
        className="case-study__sequence-title"
        id={titleId}
        text={block.title}
      />
    </header>
  );
}
