const links = [
  { label: "Portfolio", href: "#portfolio" },
  { label: "Sobre mí", href: "#sobre-mi" },
  { label: "Contacto", href: "#contacto" },
];

export function SiteNavigation() {
  return (
    <nav className="site-nav" aria-label="Navegación principal">
      <a className="site-nav__mark" href="#inicio" aria-label="Ir al inicio">
        SF
      </a>
      <ul className="site-nav__links">
        {links.map((link) => (
          <li key={link.href}>
            <a href={link.href}>{link.label}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
