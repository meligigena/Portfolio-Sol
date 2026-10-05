export const STANDARD_SECTION_DEFINITIONS = [
  {
    key: "stories",
    type: "storySequence",
    label: "Stories",
    mediaKind: "story",
    dataModel: "direct",
    draftField: "stories",
    initialConfig: { presentation: "singlePhone" },
    editor: { uploader: "direct", contexts: ["root", "edition"] },
    public: {
      renderer: "storySequence",
      motion: "storySequence",
      className: "case-study__stories",
    },
  },
  {
    key: "videoStory",
    type: "videoStory",
    label: "VideoStory",
    mediaKind: "video",
    dataModel: "direct",
    draftField: "videoStory",
    initialConfig: { presentation: "phone" },
    editor: {
      uploader: "direct",
      contexts: ["root", "edition"],
      pendingItemMetadata: { presentation: "phone" },
      maxItems: 1,
      showAudio: true,
    },
    public: {
      renderer: "videoStory",
      motion: "storySequence",
      className: "case-study__stories",
    },
  },
  {
    key: "posts",
    type: "postGrid",
    label: "Posts",
    mediaKind: "post",
    dataModel: "direct",
    draftField: "posts",
    initialConfig: {},
    editor: { uploader: "direct", contexts: ["root", "edition"] },
    public: {
      renderer: "postGrid",
      motion: "postPairs",
      className: "case-study__posts",
    },
  },
  {
    key: "carousels",
    type: "carouselPairs",
    label: "Carruseles",
    mediaKind: "carouselSlide",
    dataModel: "grouped",
    draftField: "carousels",
    initialConfig: {},
    editor: {
      uploader: "grouped",
      groupKind: "carousel",
      contexts: ["root", "edition"],
    },
    public: {
      renderer: "carouselPairs",
      motion: "carouselPairs",
      className: "case-study__carousels",
    },
  },
  {
    key: "videos",
    type: "videoStack",
    label: "Videos",
    mediaKind: "video",
    dataModel: "direct",
    draftField: "videos",
    initialConfig: {},
    editor: {
      uploader: "direct",
      contexts: ["root", "edition"],
      showAudio: true,
    },
    public: {
      renderer: "videoStack",
      motion: "videoStack",
      className: "case-study__videos",
    },
  },
  {
    key: "catalogs",
    type: "catalogPair",
    label: "Catálogos",
    mediaKind: "catalogPage",
    dataModel: "grouped",
    draftField: "catalogs",
    initialConfig: {},
    editor: {
      uploader: "grouped",
      groupKind: "catalog",
      contexts: ["root", "edition"],
    },
    public: {
      renderer: "catalogPair",
      motion: "catalogPair",
      className: "case-study__catalogs",
    },
  },
  {
    key: "banners",
    type: "banners",
    label: "Banners",
    mediaKind: "banner",
    dataModel: "direct",
    draftField: "banners",
    initialConfig: { presentation: "responsiveBanner" },
    editor: { uploader: "banners", contexts: ["root", "edition"] },
    public: {
      renderer: "banners",
      motion: "responsiveBanner",
      className: "case-study__custom-media",
    },
  },
  {
    key: null,
    type: "mediaRows",
    label: "Filas de videos",
    mediaKind: "video",
    dataModel: "grouped",
    draftField: null,
    initialConfig: {},
    editor: {
      uploader: "grouped",
      groupKind: "media_row",
      contexts: ["edition"],
      showAudio: true,
    },
    public: {
      renderer: "mediaRows",
      motion: "mediaRows",
      className: "case-study__posts case-study__strip-posts",
    },
    legacy: true,
  },
];

export function getStandardSectionDefinitionByKey(key) {
  return STANDARD_SECTION_DEFINITIONS.find((definition) => definition.key === key);
}

export function getStandardSectionDefinitionByType(type) {
  return STANDARD_SECTION_DEFINITIONS.find((definition) => definition.type === type);
}
