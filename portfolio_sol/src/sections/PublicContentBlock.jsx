import { CarouselPairs } from "../components/media/CarouselPairs";
import { CatalogPair } from "../components/media/CatalogPair";
import { MediaRows } from "../components/media/MediaRows";
import { PostGrid } from "../components/media/PostGrid";
import { ProjectMedia } from "../components/media/ProjectMedia";
import { ResponsiveBrandBanner } from "../components/media/ResponsiveBrandBanner";
import { StorySequence } from "../components/media/StorySequence";
import { VideoStack } from "../components/media/VideoStack";
import { DisplayHeading } from "../components/typography/DisplayHeading";
import { getStandardSectionDefinitionByType } from "./sectionRegistry";

const PUBLIC_RENDERERS = {
  storySequence: (block, priority) => {
    const items = block.items ?? [];
    const hasPresentation =
      items.some((item) => item.src) || Boolean(block.companionVideo?.src);

    return hasPresentation ? (
      <StorySequence projects={items} videoStory={block.companionVideo} priority={priority} />
    ) : (
      <div className="case-study__story-flow">
        {items.map((project, index) => (
          <ProjectMedia project={project} index={index} key={project.id} />
        ))}
      </div>
    );
  },
  videoStory: (block) => (
    <StorySequence projects={[]} videoStory={block.items?.[0] ?? null} />
  ),
  postGrid: (block, priority) => <PostGrid items={block.items ?? []} priority={priority} />,
  carouselPairs: (block) => <CarouselPairs items={block.items ?? []} />,
  videoStack: (block) => <VideoStack items={block.items ?? []} />,
  catalogPair: (block) => <CatalogPair items={block.items ?? []} />,
  mediaRows: (block) => <MediaRows rows={block.rows ?? []} />,
  banners: (block, priority) => (
    <ResponsiveBrandBanner
      items={block.items ?? []}
      presentation={block.presentation}
      priority={priority}
    />
  ),
};

function CustomMedia({ block, priority }) {
  const hasResponsivePair =
    block.presentation === "responsiveBanner" &&
    block.items.some((item) => item.viewport === "desktop") &&
    block.items.some((item) => item.viewport === "mobile");

  return hasResponsivePair ? (
    <ResponsiveBrandBanner items={block.items} presentation={block.presentation} priority={priority} />
  ) : (
    <div className="case-study__custom-media-grid">
      {block.items.map((project, index) => (
        <ProjectMedia project={project} index={index} key={project.id} priority={priority && index === 0} />
      ))}
    </div>
  );
}

export function SequenceSection({
  block,
  children,
  className,
  motion,
  renderer,
  titleId,
}) {
  return (
    <section
      className={`case-study__sequence ${className}`}
      aria-labelledby={titleId}
      data-section-motion={motion}
      data-section-renderer={renderer}
      data-section-type={block.type}
    >
      <header className="case-study__sequence-header">
        <DisplayHeading
          as="h2"
          className="case-study__sequence-title"
          id={titleId}
          text={block.title}
        />
      </header>
      {children}
    </section>
  );
}

export function PublicContentBlock({ block, blockIndex }) {
  const titleId = `${block.type}-${blockIndex}`;

  if (block.type === "phoneStories") {
    return (
      <SequenceSection
        block={block}
        className="case-study__stories"
        motion="storySequence"
        renderer="storySequence"
        titleId={titleId}
      >
        <StorySequence
          projects={block.stories.items ?? []}
          videoStory={block.videoStory.items?.[0] ?? null}
          priority={blockIndex === 0}
        />
      </SequenceSection>
    );
  }

  if (block.type === "customMedia") {
    return (
      <SequenceSection
        block={block}
        className="case-study__custom-media"
        motion={block.presentation === "responsiveBanner" ? "responsiveBanner" : "sectionReveal"}
        renderer="customMedia"
        titleId={titleId}
      >
        <CustomMedia block={{ ...block, items: block.items ?? [] }} priority={blockIndex === 0} />
      </SequenceSection>
    );
  }

  const definition = getStandardSectionDefinitionByType(block.type);
  const render = PUBLIC_RENDERERS[definition?.public.renderer];
  if (!definition || !render) return null;

  return (
    <SequenceSection
      block={block}
      className={definition.public.className}
      motion={definition.public.motion}
      renderer={definition.public.renderer}
      titleId={titleId}
    >
      {render(block, blockIndex === 0)}
    </SequenceSection>
  );
}
