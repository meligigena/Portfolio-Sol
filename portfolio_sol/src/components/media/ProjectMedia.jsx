import { portfolioMediaUrl } from "../../lib/portfolioMedia";

export function ProjectMedia({ project, index }) {
  const ratio = `${project.width} / ${project.height}`;
  const mediaKind = project.type === "story" ? "story" : project.type === "post" ? "post" : project.type;
  const usesTypeOnlyLabel =
    Boolean(project.src) && (mediaKind === "story" || mediaKind === "post");
  const source = project.src ? portfolioMediaUrl(project.src) : null;
  const poster = project.poster ? portfolioMediaUrl(project.poster) : null;

  if (project.type === "video" && project.src) {
    return (
      <figure className="project-media" data-presentation={project.presentation}>
        <video
          controls
          poster={poster}
          preload="none"
          width={project.width}
          height={project.height}
        >
          <source src={source} />
        </video>
        <figcaption>{project.title}</figcaption>
      </figure>
    );
  }

  return (
    <figure
      className="project-media"
      data-media-kind={mediaKind}
      data-presentation={project.presentation}
    >
      {project.src ? (
        project.presentation === "phone" ? (
          <div className="project-media__phone">
            <div className="project-media__phone-screen">
              <img
                src={source}
                alt={project.alt}
                width={project.width}
                height={project.height}
                loading="lazy"
                decoding="async"
              />
            </div>
            <img
              className="project-media__phone-frame"
              src="/iphone.png"
              alt=""
              width="360"
              height="722"
              loading="lazy"
              decoding="async"
              aria-hidden="true"
            />
          </div>
        ) : (
          <img
            src={source}
            alt={project.alt}
            width={project.width}
            height={project.height}
            loading="lazy"
            decoding="async"
          />
        )
      ) : (
        <div
          className="project-media__placeholder"
          style={{ aspectRatio: ratio }}
          role="img"
          aria-label={project.alt}
        >
          <span className="project-media__cross" aria-hidden="true" />
          <strong>ASSET PENDIENTE</strong>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <span>{project.type.toUpperCase()}</span>
        </div>
      )}
      {usesTypeOnlyLabel ? (
        <figcaption>{mediaKind.toUpperCase()}</figcaption>
      ) : (
        <figcaption>
          <h2>{project.title}</h2>
          <span>{project.type}</span>
        </figcaption>
      )}
    </figure>
  );
}
