import { useSectionReveal } from "../animations/useSectionReveal";
import { NetworkTitle } from "../components/typography/NetworkTitle";
import { usePortfolioData } from "../data/PortfolioDataContext";

const ABOUT_PROFILE_LABEL = "PERFIL / EXPERIENCIA";

function Language({ value }) {
  const [label, ...detailParts] = value.split(" — ");
  const detail = detailParts.join(" — ");

  return (
    <p>
      {label}
      {detail && <span> — {detail}</span>}
    </p>
  );
}

export function About({ content: contentProp }) {
  const sectionRef = useSectionReveal();
  const { aboutContent, aboutStatus } = usePortfolioData();
  const content = contentProp ?? aboutContent;
  const graphicDesign = content?.graphicDesign ?? [];
  const videoEditing = content?.videoEditing ?? [];
  const keySkills = content?.keySkills ?? [];
  const technicalSkills = content?.technicalSkills ?? [];
  const languages = content?.languages ?? [];

  return (
    <section
      ref={sectionRef}
      className="about"
      id="sobre-mi"
      aria-labelledby="about-title"
      aria-busy={!content && aboutStatus === "loading"}
    >
      <header className="about__header" data-reveal>
        <span className="about__divider" data-section-divider aria-hidden="true" />
        <NetworkTitle id="about-title" text="Sobre mí" />
        <p>{ABOUT_PROFILE_LABEL}</p>
      </header>

      <div className="about__lead">
        <figure className="about__portrait" data-reveal>
          <img
            className="about__portrait-image"
            src="/fotografia_personal.jpeg"
            alt="Sol Fanara"
            width="2208"
            height="1242"
            loading="lazy"
            decoding="async"
          />
        </figure>

        <div className="about__services">
          <article data-reveal>
            <p className="about__label">DISEÑO GRÁFICO</p>
            <span className="about__block-divider" data-block-divider aria-hidden="true" />
            {graphicDesign.map((paragraph, index) => (
              <p key={`${index}-${paragraph}`}>{paragraph}</p>
            ))}
          </article>

          <article data-reveal>
            <p className="about__label">EDICIÓN DE VIDEO</p>
            <span className="about__block-divider" data-block-divider aria-hidden="true" />
            {videoEditing.map((paragraph, index) => (
              <p key={`${index}-${paragraph}`}>{paragraph}</p>
            ))}
          </article>
        </div>
      </div>

      <div className="about__skills">
        <article className="about__key-skills" data-reveal>
          <h3>Habilidades clave</h3>
          <span className="about__block-divider" data-block-divider aria-hidden="true" />
          <ul>
            {keySkills.map((skill, index) => (
              <li key={`${index}-${skill}`}>{skill}</li>
            ))}
          </ul>
        </article>

        <article className="about__technical" data-reveal>
          <h3>Habilidades técnicas</h3>
          <span className="about__block-divider" data-block-divider aria-hidden="true" />
          <ul>
            {technicalSkills.map((skill, index) => (
              <li key={`${index}-${skill}`}>{skill}</li>
            ))}
          </ul>
        </article>

        <article className="about__language" data-reveal>
          <h3>Idiomas</h3>
          <span className="about__block-divider" data-block-divider aria-hidden="true" />
          <div className="about__language-list">
            {languages.map((language, index) => (
              <Language key={`${index}-${language}`} value={language} />
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
