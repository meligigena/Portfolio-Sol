export function SoundToggleButton({ enabled, onClick }) {
  return (
    <button
      aria-label={enabled ? "Desactivar sonido" : "Activar sonido"}
      aria-pressed={enabled}
      className="video-sound-toggle"
      onClick={onClick}
      type="button"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" />
        {enabled ? (
          <>
            <path d="M15 9.2a4 4 0 0 1 0 5.6" />
            <path d="M17.8 6.5a7.5 7.5 0 0 1 0 11" />
          </>
        ) : (
          <>
            <path d="m15.5 10 5 5" />
            <path d="m20.5 10-5 5" />
          </>
        )}
      </svg>
    </button>
  );
}
