import { IMAGE_MIME_TYPES, VIDEO_MIME_TYPES } from "./adminValidation";
import {
  STANDARD_SECTION_DEFINITIONS,
  getStandardSectionDefinitionByKey,
  getStandardSectionDefinitionByType,
} from "../sections/sectionRegistry";

const IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp";
const VIDEO_ACCEPT = ".mp4";

export const ADMIN_SECTION_DEFINITIONS = STANDARD_SECTION_DEFINITIONS.map(
  (definition) => {
    const acceptsVideo = definition.mediaKind === "video";
    return {
      ...definition,
      ...definition.editor,
      accept: acceptsVideo ? VIDEO_ACCEPT : IMAGE_ACCEPT,
      allowedMimeTypes: acceptsVideo ? VIDEO_MIME_TYPES : IMAGE_MIME_TYPES,
    };
  },
);

export const CUSTOM_SECTION_DEFINITION = {
  key: null,
  type: "customMedia",
  label: "Sección personalizada",
  mediaKind: "custom",
  uploader: "direct",
  accept: `${IMAGE_ACCEPT},${VIDEO_ACCEPT}`,
  allowedMimeTypes: [...IMAGE_MIME_TYPES, ...VIDEO_MIME_TYPES],
  contexts: ["root", "edition"],
  initialConfig: { presentation: "mediaGrid" },
  multiple: true,
  showAudio: true,
};

export function getSectionDefinitionByKey(key) {
  const definition = getStandardSectionDefinitionByKey(key);
  return definition
    ? ADMIN_SECTION_DEFINITIONS.find((candidate) => candidate.type === definition.type)
    : undefined;
}

export function getSectionDefinitionByType(type) {
  return type === CUSTOM_SECTION_DEFINITION.type
    ? CUSTOM_SECTION_DEFINITION
    : getStandardSectionDefinitionByType(type)
      ? ADMIN_SECTION_DEFINITIONS.find((definition) => definition.type === type)
      : undefined;
}

export function getAvailableSectionDefinitions({ context, presentTypes = [] }) {
  const present = new Set(presentTypes);
  return [
    ...ADMIN_SECTION_DEFINITIONS.filter(
      (definition) =>
        definition.contexts.includes(context) && !present.has(definition.type),
    ),
    CUSTOM_SECTION_DEFINITION,
  ];
}
