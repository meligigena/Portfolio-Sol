import { useState } from "react";
import { DisplayHeading } from "../components/typography/DisplayHeading";

const LIST_FIELDS = [
  {
    field: "graphicDesign",
    title: "Diseño Gráfico",
    itemLabel: "texto de Diseño Gráfico",
    multiline: true,
  },
  {
    field: "videoEditing",
    title: "Edición de Video",
    itemLabel: "texto de Edición de Video",
    multiline: true,
  },
  {
    field: "keySkills",
    title: "Habilidades clave",
    itemLabel: "habilidad clave",
  },
  {
    field: "technicalSkills",
    title: "Habilidades técnicas",
    itemLabel: "habilidad técnica",
  },
  {
    field: "languages",
    title: "Idiomas",
    itemLabel: "idioma",
  },
];

function cloneContent(content) {
  return {
    graphicDesign: [...(content.graphicDesign ?? [])],
    videoEditing: [...(content.videoEditing ?? [])],
    keySkills: [...(content.keySkills ?? [])],
    technicalSkills: [...(content.technicalSkills ?? [])],
    languages: [...(content.languages ?? [])],
  };
}

function moveItem(items, index, offset) {
  const target = index + offset;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function ContentList({ config, items, onChange }) {
  const Input = config.multiline ? "textarea" : "input";

  return (
    <section className="admin-about__section">
      <DisplayHeading as="h2" text={config.title} />
      <div className="admin-about__list">
        {items.map((item, index) => (
          <div className="admin-about__item" key={`${config.field}-${index}`}>
            <label>
              {config.title} {index + 1}
              <Input
                onChange={(event) =>
                  onChange(
                    items.map((entry, itemIndex) =>
                      itemIndex === index ? event.target.value : entry,
                    ),
                  )
                }
                value={item}
              />
            </label>
            <div className="admin-about__item-actions">
              <button
                aria-label={`Subir ${config.itemLabel} ${index + 1}`}
                disabled={index === 0}
                onClick={() => onChange(moveItem(items, index, -1))}
                type="button"
              >
                Subir
              </button>
              <button
                aria-label={`Bajar ${config.itemLabel} ${index + 1}`}
                disabled={index === items.length - 1}
                onClick={() => onChange(moveItem(items, index, 1))}
                type="button"
              >
                Bajar
              </button>
              <button
                aria-label={`Eliminar ${config.itemLabel} ${index + 1}`}
                onClick={() =>
                  onChange(items.filter((_entry, itemIndex) => itemIndex !== index))
                }
                type="button"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        className="admin-secondary-action"
        onClick={() => onChange([...items, ""])}
        type="button"
      >
        + Añadir {config.itemLabel}
      </button>
    </section>
  );
}

function validateContent(content) {
  if (content.graphicDesign.length === 0) {
    return "Añadí al menos un texto de Diseño Gráfico.";
  }
  if (content.videoEditing.length === 0) {
    return "Añadí al menos un texto de Edición de Video.";
  }
  const hasBlankItem = LIST_FIELDS.some(({ field }) =>
    content[field].some((item) => !item.trim()),
  );
  if (hasBlankItem) return "Completá o eliminá los items vacíos antes de guardar.";
  return "";
}

function normalizedContent(content) {
  return {
    graphicDesign: content.graphicDesign.map((item) => item.trim()),
    videoEditing: content.videoEditing.map((item) => item.trim()),
    keySkills: content.keySkills.map((item) => item.trim()),
    technicalSkills: content.technicalSkills.map((item) => item.trim()),
    languages: content.languages.map((item) => item.trim()),
  };
}

export function AboutEditor({ initialContent, onCancel, onSaved, service }) {
  const [draft, setDraft] = useState(() => cloneContent(initialContent));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const validationError = validateContent(draft);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError("");
    try {
      await service.saveAboutContent(normalizedContent(draft));
      setComplete(true);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  if (complete) {
    return (
      <section className="admin-success" aria-live="polite">
        <DisplayHeading as="h1" text="Cambios guardados correctamente" />
        <div>
          <button onClick={onSaved} type="button">Volver al panel</button>
          <a href="/#sobre-mi">Ver Sobre mí en el portfolio</a>
        </div>
      </section>
    );
  }

  return (
    <form className="admin-editor admin-about" onSubmit={submit}>
      <header className="admin-editor__header">
        <div>
          <p>Contenido público</p>
          <DisplayHeading as="h1" text="Editar Sobre mí" />
        </div>
      </header>
      <div className="admin-editor__actions">
        <button disabled={saving} onClick={onCancel} type="button">Cancelar</button>
        <button className="admin-confirm" disabled={saving} type="submit">
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>

      {LIST_FIELDS.map((config) => (
        <ContentList
          config={config}
          items={draft[config.field]}
          key={config.field}
          onChange={(items) =>
            setDraft((current) => ({ ...current, [config.field]: items }))
          }
        />
      ))}

      {error && <p className="admin-error" role="alert">{error}</p>}
    </form>
  );
}
