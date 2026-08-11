import { SiteNavigation } from "../components/navigation/SiteNavigation";
import { About } from "../sections/About";
import { Contact } from "../sections/Contact";
import { Hero } from "../sections/Hero";
import { PortfolioRail } from "../sections/PortfolioRail";

export function HomePage() {
  return (
    <>
      <SiteNavigation />
      <main id="main-content">
        <Hero />
        <PortfolioRail />
        <About />
        <Contact />
      </main>
    </>
  );
}
