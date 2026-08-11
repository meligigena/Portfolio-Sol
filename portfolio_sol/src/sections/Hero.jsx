import { useHeroMotion } from "../animations/useHeroMotion";
import { NetworkTitle } from "../components/typography/NetworkTitle";

const title = "PORTFOLIO";

export function Hero() {
  const heroRef = useHeroMotion();

  return (
    <section
      ref={heroRef}
      className="hero"
      id="inicio"
      aria-labelledby="hero-title"
    >
      <div className="hero__title-stage">
        <p className="hero__eyebrow">SOL FANARA</p>
        <NetworkTitle as="h1" className="hero__title" id="hero-title" text={title}>
          {(visualTitle) => visualTitle.split("").map((letter, index) => (
            <span className="hero__letter" aria-hidden="true" key={index}>
              {letter}
            </span>
          ))}
        </NetworkTitle>
      </div>

      <div className="hero__footer">
        <a href="#portfolio">Ver proyectos <span aria-hidden="true">↓</span></a>
      </div>
    </section>
  );
}
