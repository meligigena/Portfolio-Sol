import { useSectionReveal } from "../animations/useSectionReveal";
import { NetworkTitle } from "../components/typography/NetworkTitle";
import { contact } from "../data/contact";

export function Contact() {
  const sectionRef = useSectionReveal();

  return (
    <section
      ref={sectionRef}
      className="contact"
      id="contacto"
      aria-labelledby="contact-title"
    >
      <header className="contact__header" data-reveal>
        <span className="contact__divider" data-section-divider aria-hidden="true" />
        <NetworkTitle id="contact-title" text="Contacto" />
        <p>DISEÑO GRÁFICO / EDICIÓN DE VIDEO</p>
      </header>

      <div className="contact__links" data-reveal>
        <a
          className="contact__email"
          href={contact.emailHref}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="contact__action-content">
            <svg
              viewBox="0 0 32 32"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="3.5"
                y="6.5"
                width="25"
                height="19"
                rx="2"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="m5 8 11 9 11-9"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
            <span className="contact__primary-text">{contact.email}</span>
          </span>
        </a>

        <a
          className="contact__whatsapp"
          href={contact.whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="contact__action-content">
            <svg
              viewBox="0 0 32 32"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill="currentColor"
                d="M16.05 3A12.82 12.82 0 0 0 5 22.3L3.3 29l6.86-1.8A12.88 12.88 0 1 0 16.05 3Zm0 23.42a10.5 10.5 0 0 1-5.36-1.47l-.38-.22-4.08 1.07 1.09-3.97-.25-.41a10.54 10.54 0 1 1 8.98 5Zm5.77-7.9c-.31-.16-1.87-.92-2.16-1.03-.29-.11-.5-.16-.71.16-.21.31-.81 1.03-.99 1.24-.18.21-.37.24-.68.08-.32-.16-1.33-.49-2.54-1.57a9.54 9.54 0 0 1-1.76-2.19c-.18-.31-.02-.48.14-.64.14-.14.31-.37.47-.55.16-.18.21-.31.31-.52.11-.21.05-.39-.02-.55-.08-.16-.71-1.71-.97-2.34-.26-.62-.52-.54-.71-.55h-.6c-.21 0-.55.08-.84.39-.29.31-1.1 1.08-1.1 2.63s1.13 3.05 1.29 3.26c.16.21 2.22 3.39 5.38 4.75.75.32 1.34.52 1.8.66.76.24 1.44.21 1.99.13.61-.09 1.87-.76 2.13-1.5.26-.74.26-1.37.18-1.5-.08-.13-.29-.21-.6-.37Z"
              />
            </svg>
            <span className="contact__primary-text">Escribir por Whatsapp</span>
          </span>
        </a>
      </div>

      <footer className="contact__footer">
        <span>SOL FANARA</span>
        <span>PORTFOLIO / 2026</span>
      </footer>
    </section>
  );
}
