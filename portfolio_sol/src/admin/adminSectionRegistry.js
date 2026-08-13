import { IMAGE_MIME_TYPES, VIDEO_MIME_TYPES } from "./adminValidation";

const IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp";
const VIDEO_ACCEPT = ".mp4";

export const ADMIN_SECTION_DEFINITIONS = [
  {
    key: "stories",
    type: "storySequence",
    label: "Stories",
    mediaKind: "story",
    uploader: "direct",
    draftField: "stories",
    accept: IMAGE_ACCEPT,
    allowedMimeTypes: IMAGE_MIME_TYPES,
    contexts: ["root", "edition"],
    initialConfig: { presentation: "singlePhone" },
  },
  {
    key: "posts",
    type: "postGrid",
    label: "Posts",
    mediaKind: "post",
    uploader: "direct",
    draftField: "posts",
    accept: IMAGE_ACCEPT,
    allowedMimeTypes: IMAGE_MIME_TYPES,
    contexts: ["root", "edition"],
    initialConfig: {},
  },
  {
    key: "carousels",
    type: "carouselPairs",
    label: "Carruseles",
    mediaKind: "carouselSlide",
    uploader: "grouped",
    groupKind: "carousel",
    draftField: "carousels",
    accept: IMAGE_ACCEPT,
    allowedMimeTypes: IMAGE_MIME_TYPES,
    contexts: ["root", "edition"],
    initialConfig: {},
  },
  {
    key: "videos",
    type: "videoStack",
    label: "Videos",
    mediaKind: "video",
    uploader: "direct",
    draftField: "videos",
    accept: VIDEO_ACCEPT,
    allowedMimeTypes: VIDEO_MIME_TYPES,
    contexts: ["root", "edition"],
    initialConfig: {},
    showAudio: true,
  },
  {
    key: "catalogs",
    type: "catalogPair",
    label: "Catálogos",
    mediaKind: "catalogPage",
    uploader: "grouped",
    groupKind: "catalog",
    draftField: "catalogs",
    accept: IMAGE_ACCEPT,
    allowedMimeTypes: IMAGE_MIME_TYPES,
    contexts: ["root", "edition"],
    initialConfig: {},
  },
  {
    key: "banners",
    type: "banners",
    label: "Banners",
    mediaKind: "banner",
    uploader: "banners",
    draftField: "banners",
    accept: IMAGE_ACCEPT,
    allowedMimeTypes: IMAGE_MIME_TYPES,
    contexts: ["root", "edition"],
    initialConfig: { presentation: "responsiveBanner" },
  },
  {
    key: null,
    type: "mediaRows",
    label: "Filas de videos",
    mediaKind: "video",
    uploader: "grouped",
    groupKind: "media_row",
    draftField: null,
    accept: VIDEO_ACCEPT,
    allowedMimeTypes: VIDEO_MIME_TYPES,
    contexts: ["edition"],
    initialConfig: {},
    showAudio: true,
  },
];

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
  return ADMIN_SECTION_DEFINITIONS.find((definition) => definition.key === key);
}

export function getSectionDefinitionByType(type) {
  return type === CUSTOM_SECTION_DEFINITION.type
    ? CUSTOM_SECTION_DEFINITION
    : ADMIN_SECTION_DEFINITIONS.find((definition) => definition.type === type);
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
