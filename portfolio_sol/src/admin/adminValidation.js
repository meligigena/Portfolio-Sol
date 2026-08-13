import {
  inspectMp4Video,
  validateVideoCompatibility,
} from "./videoCompatibility";

export const MAX_FILE_BYTES = 50 * 1024 * 1024;

export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export const VIDEO_MIME_TYPES = ["video/mp4"];

export const VIDEO_UPLOAD_HELP = "Videos: MP4 en H.264 · Máximo 50 MB";

export const VIDEO_UPLOAD_MESSAGES = {
  preparationFailed:
    "No pudimos preparar este video automáticamente. Volvé a exportarlo como MP4 H.264 e intentá nuevamente.",
  invalidFormat: "El video debe estar en formato MP4.",
  tooLarge: "El video supera el máximo permitido de 50 MB.",
};

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
  if (!draft.logo && !editing) {
    errors.logo = "El logo es obligatorio.";
  }
  if (
    draft.customSections?.some(
      (section) => !section.removed && !section.title?.trim(),
    )
  ) {
    errors.customSections = "Cada sección personalizada necesita un nombre.";
  }
  if (
    draft.editionDrafts?.some((edition) =>
      edition.sections.some(
        (section) =>
          !section.removed &&
          section.type === "customMedia" &&
          !section.title?.trim(),
      ),
    )
  ) {
    errors.customSections = "Cada sección personalizada necesita un nombre.";
  }

  return errors;
}

export function validateFiles(files, allowedMimeTypes) {
  return [...files].flatMap((file) => {
    const isVideoUpload =
      file.type.startsWith("video/") && allowedMimeTypes.includes("video/mp4");

    if (!allowedMimeTypes.includes(file.type)) {
      return [
        {
          file,
          message: isVideoUpload
            ? VIDEO_UPLOAD_MESSAGES.invalidFormat
            : `El formato de ${file.name} no está permitido.`,
        },
      ];
    }

    if (file.size > MAX_FILE_BYTES) {
      return [
        {
          file,
          message: isVideoUpload
            ? VIDEO_UPLOAD_MESSAGES.tooLarge
            : FILE_TOO_LARGE_MESSAGE,
        },
      ];
    }

    return [];
  });
}

export async function validateFilesForUpload(files, allowedMimeTypes) {
  const basicErrors = validateFiles(files, allowedMimeTypes);
  if (basicErrors.length > 0) return basicErrors;

  for (const file of files) {
    if (!file.type.startsWith("video/")) continue;
    const message = await validateVideoCompatibility(file);
    if (message) return [{ file, message }];
  }

  return [];
}

export async function prepareFilesForUpload(
  files,
  allowedMimeTypes,
  { fixFastStart, onFastStartRequired = () => {} } = {},
) {
  const sourceFiles = [...files];
  const basicErrors = validateFiles(sourceFiles, allowedMimeTypes);
  if (basicErrors.length > 0) {
    return { details: [], errors: basicErrors, files: [] };
  }

  const preparedFiles = [];
  const preparedDetails = [];

  for (const file of sourceFiles) {
    if (!file.type.startsWith("video/")) {
      preparedFiles.push(file);
      preparedDetails.push(null);
      continue;
    }

    const compatibilityError = await validateVideoCompatibility(file, {
      requireFastStart: false,
    });
    if (compatibilityError) {
      return {
        details: [],
        errors: [{ file, message: compatibilityError }],
        files: [],
      };
    }

    const details = await inspectMp4Video(file);
    if (details.fastStart) {
      preparedFiles.push(file);
      preparedDetails.push(details);
      continue;
    }

    onFastStartRequired(file);

    try {
      const fixer = fixFastStart ?? (await import("./videoFastStart")).fastStartMp4;
      const preparedFile = await fixer(file);
      const preparedBasicErrors = validateFiles([preparedFile], allowedMimeTypes);
      const preparedCompatibilityError = preparedBasicErrors[0]?.message
        ?? await validateVideoCompatibility(preparedFile);

      if (preparedCompatibilityError) throw new Error(preparedCompatibilityError);

      preparedFiles.push(preparedFile);
      preparedDetails.push(await inspectMp4Video(preparedFile));
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("MP4 faststart preparation failed", error);
      }
      return {
        details: [],
        errors: [{ file, message: VIDEO_UPLOAD_MESSAGES.preparationFailed }],
        files: [],
      };
    }
  }

  return { details: preparedDetails, errors: [], files: preparedFiles };
}

export function assertSafeClientSlug(slug) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("El slug del cliente no es seguro.");
  }

  return slug;
}
