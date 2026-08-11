export const MAX_FILE_BYTES = 50 * 1024 * 1024;

export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export const VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

const FILE_TOO_LARGE_MESSAGE =
  "El archivo supera el máximo permitido de 50 MB. Reducí su tamaño antes de volver a intentarlo.";

export function slugifyClientName(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function safeStorageFileName(value) {
  const lastDot = value.lastIndexOf(".");
  const extension = lastDot > -1 ? value.slice(lastDot).toLowerCase() : "";
  const baseName = lastDot > -1 ? value.slice(0, lastDot) : value;
  const safeBase = slugifyClientName(baseName) || "archivo";
  return `${safeBase}${extension.replace(/[^a-z0-9.]/g, "")}`;
}

export function validateClientDraft(draft, { editing = false } = {}) {
  const errors = {};

  if (!draft.name?.trim()) errors.name = "El nombre es obligatorio.";
  if (!String(draft.year ?? "").trim()) errors.year = "El año es obligatorio.";
  if (!draft.discipline?.trim()) {
    errors.discipline = "El rubro o disciplina es obligatorio.";
  }
  if (!draft.logo && !(editing && draft.existingLogoPath)) {
    errors.logo = "El logo es obligatorio.";
  }
  if (
    draft.customSections?.some(
      (section) => !section.removed && !section.title?.trim(),
    )
  ) {
    errors.customSections = "Cada secciÃ³n personalizada necesita un nombre.";
  }

  return errors;
}

export function validateFiles(files, allowedMimeTypes) {
  return [...files].flatMap((file) => {
    if (file.size > MAX_FILE_BYTES) {
      return [{ file, message: FILE_TOO_LARGE_MESSAGE }];
    }

    if (!allowedMimeTypes.includes(file.type)) {
      return [
        {
          file,
          message: `El formato de ${file.name} no está permitido.`,
        },
      ];
    }

    return [];
  });
}

export function assertSafeClientSlug(slug) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("El slug del cliente no es seguro.");
  }

  return slug;
}
