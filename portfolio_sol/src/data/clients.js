const peumaxStories = [69, 70, 71, 72, 73, 74, 75, 76].map((assetNumber) => ({
  id: `story-peumax-${assetNumber}`,
  title: `historias peumax (${assetNumber}).jpg`,
  type: "story",
  src: `peumax/stories/historias peumax (${assetNumber}).jpg`,
  poster: null,
  alt: `Historia de Instagram de Peumax ${assetNumber}.`,
  width: 1080,
  height: 1920,
  presentation: "phone",
}));

const peumaxPosts = [62, 63, 64, 65, 66, 67, 68, 69].map((assetNumber, index) => ({
  id: `post-peumax-${assetNumber}`,
  title: `post peumax (${assetNumber}).jpg`,
  type: "post",
  src: `peumax/posts/post peumax (${assetNumber}).jpg`,
  poster: null,
  alt: `Post de Peumax ${assetNumber}.`,
  width: 1080,
  height: 1350,
  presentation: index % 3 === 1 ? "overlap" : "raw",
}));

const peumaxCarouselA = [1, 2, 3].map((slideNumber) => ({
  id: `carousel-peumax-a-${slideNumber}`,
  title: `${slideNumber} A.jpg`,
  type: "carouselSlide",
  src: `peumax/carruseles/carrusel A/${slideNumber} A.jpg`,
  poster: null,
  alt: `Slide ${slideNumber} del carrusel de Peumax.`,
  width: 1080,
  height: 1350,
  presentation: "raw",
}));

const peumaxCarouselB = [1, 2].map((slideNumber) => ({
  id: `carousel-peumax-b-${slideNumber}`,
  title: `${slideNumber} B.jpg`,
  type: "carouselSlide",
  src: `peumax/carruseles/carrusel B/${slideNumber} B.jpg`,
  poster: null,
  alt: `Slide ${slideNumber} del carrusel de Peumax.`,
  width: 1080,
  height: 1350,
  presentation: "raw",
}));

const aqualandStories = [31, 32, 33, 34, 35, 36, 37].map((assetNumber) => ({
  id: `story-aqualand-${assetNumber}`,
  title: `historias aqualand (${assetNumber}).jpg`,
  type: "story",
  src: `aqualand/stories/historias aqualand (${assetNumber}).jpg`,
  poster: null,
  alt: `Historia de Instagram de Aqualand ${assetNumber}.`,
  width: 1080,
  height: 1920,
  presentation: "phone",
}));

const aqualandPosts = [53, 62, 63, 69].map((assetNumber) => ({
  id: `post-aqualand-${assetNumber}`,
  title: `post aqualand (${assetNumber}).jpg`,
  type: "post",
  src: `aqualand/posts/post aqualand (${assetNumber}).jpg`,
  poster: null,
  alt: `Post de Aqualand ${assetNumber}.`,
  width: 1080,
  height: 1350,
  presentation: "raw",
}));

const aqualandCarouselA = [1, 2, 3, 4, 5].map((slideNumber) => ({
  id: `carousel-aqualand-a-${slideNumber}`,
  title: `carrusel A ${slideNumber}.jpg`,
  type: "carouselSlide",
  src: `aqualand/carruseles/carrusel A/carrusel A ${slideNumber}.jpg`,
  poster: null,
  alt: `Slide ${slideNumber} del carrusel de Aqualand.`,
  width: 1080,
  height: 1350,
  presentation: "raw",
}));

const aqualandCarouselB = [1, 2, 3].map((slideNumber) => ({
  id: `carousel-aqualand-b-${slideNumber}`,
  title: `carrusel B ${slideNumber}.jpg`,
  type: "carouselSlide",
  src: `aqualand/carruseles/carrusel B/carrusel B ${slideNumber}.jpg`,
  poster: null,
  alt: `Slide ${slideNumber} del carrusel de Aqualand.`,
  width: 1080,
  height: 1350,
  presentation: "raw",
}));

const peumaxCarousels = [
  { id: "carousel-peumax-a", label: "Carrusel A", items: peumaxCarouselA },
  { id: "carousel-peumax-b", label: "Carrusel B", items: peumaxCarouselB },
];

const aqualandCarousels = [
  { id: "carousel-aqualand-a", label: "Carrusel A", items: aqualandCarouselA },
  { id: "carousel-aqualand-b", label: "Carrusel B", items: aqualandCarouselB },
];

function createCatalog(catalogNumber, pageCount) {
  return {
    id: `aqualand-catalogo-${catalogNumber}`,
    label: `Catálogo ${catalogNumber}`,
    pages: Array.from({ length: pageCount }, (_, index) => ({
      id: `aqualand-catalogo-${catalogNumber}-pagina-${index + 1}`,
      src: `aqualand/catalogos/catalogo${catalogNumber}/${index + 1}.jpg`,
      alt: `Página ${index + 1} del catálogo ${catalogNumber} de Aqualand.`,
      width: 1414,
      height: 2000,
    })),
  };
}

const aqualandCatalogs = [createCatalog(1, 9), createCatalog(2, 8)];

function createDesnacImage(fileName, type, index) {
  const isStory = type === "story";

  return {
    id: `${type}-desnac-${index + 1}`,
    title: fileName,
    type,
    src: `desnac/${isStory ? "stories" : "posts"}/${fileName}`,
    poster: null,
    alt: `${isStory ? "Historia" : "Post"} de Desnac ${index + 1}.`,
    width: 1080,
    height: isStory ? 1920 : 1350,
    presentation: isStory ? "phone" : "raw",
  };
}

const desnacStories = [
  "historias desnac.jpg",
  "historias desnac (1).jpg",
  "historias desnac (2).jpg",
  "historias desnac (3).jpg",
  "historias desnac (4).jpg",
  "historias desnac (5).jpg",
  "historias desnac (6).jpg",
].map((fileName, index) => createDesnacImage(fileName, "story", index));

const desnacPosts = [
  "post desnac.jpg",
  "post desnac (1).jpg",
  "post desnac (2).jpg",
  "post desnac (3).jpg",
  "post desnac (4).jpg",
  "post desnac (5).jpg",
].map((fileName, index) => createDesnacImage(fileName, "post", index));

function createDesnacCarousel(letter, slideCount) {
  return {
    id: `carousel-desnac-${letter.toLowerCase()}`,
    label: `Carrusel ${letter}`,
    items: Array.from({ length: slideCount }, (_, index) => ({
      id: `carousel-desnac-${letter.toLowerCase()}-${index + 1}`,
      title: `${letter.toLowerCase()} ${index + 1}.jpg`,
      type: "carouselSlide",
      src: `desnac/carruseles/carrusel ${letter}/${letter.toLowerCase()} ${index + 1}.jpg`,
      poster: null,
      alt: `Slide ${index + 1} del carrusel ${letter} de Desnac.`,
      width: 1080,
      height: 1350,
      presentation: "raw",
    })),
  };
}

const desnacCarousels = [
  createDesnacCarousel("A", 4),
  createDesnacCarousel("B", 5),
  createDesnacCarousel("C", 3),
  createDesnacCarousel("D", 4),
];

const desnacVideos = [
  "apps desnac 2-web-h264.mp4",
  "Copia de IMG_6492-web-h264.mp4",
  "Copia de power bi-web-h264.mp4",
].map((fileName, index) => ({
  id: `video-desnac-${index + 1}`,
  title: "VIDEO",
  type: "video",
  src: `desnac/videos/${fileName}`,
  poster: null,
  alt: `Video de Desnac ${index + 1}.`,
  width: 1080,
  height: 1920,
  presentation: "reel",
}));

function createStandardImageSet({
  assetSlug = null,
  clientName,
  clientSlug,
  fileNames,
  type,
}) {
  const isStory = type === "story";
  const publicSlug = assetSlug ?? clientSlug;

  return fileNames.map((fileName, index) => ({
    id: `${type}-${clientSlug}-${index + 1}`,
    title: fileName,
    type,
    src: `${publicSlug}/${isStory ? "stories" : "posts"}/${fileName}`,
    poster: null,
    alt: `${isStory ? "Historia" : "Post"} de ${clientName} ${index + 1}.`,
    width: 1080,
    height: isStory ? 1920 : 1350,
    presentation: isStory ? "phone" : "raw",
  }));
}

function createStandardVideoSet({ assetSlug = null, clientName, clientSlug, files }) {
  const publicSlug = assetSlug ?? clientSlug;

  return files.map((file, index) => {
    const { fileName, height = 1920, width = 1080 } =
      typeof file === "string" ? { fileName: file } : file;

    return {
      id: `video-${clientSlug}-${index + 1}`,
      title: "VIDEO",
      type: "video",
      src: `${publicSlug}/videos/${fileName}`,
      poster: null,
      alt: `Video de ${clientName} ${index + 1}.`,
      width,
      height,
      presentation: "reel",
    };
  });
}

const sistemasMovilesAssetSlug = "sistemas-moviles";

const sistemasMovilesStories = createStandardImageSet({
  assetSlug: sistemasMovilesAssetSlug,
  clientName: "Sistemas Móviles",
  clientSlug: "sistemas-moviles",
  type: "story",
  fileNames: [
    "historias sistemas (11).jpg",
    "historias sistemas (12).jpg",
    "historias sistemas (13).jpg",
  ],
});

const sistemasMovilesPosts = createStandardImageSet({
  assetSlug: sistemasMovilesAssetSlug,
  clientName: "Sistemas Móviles",
  clientSlug: "sistemas-moviles",
  type: "post",
  fileNames: [
    "post sistemas moviles (18).jpg",
    "post sistemas moviles (19).jpg",
    "post sistemas moviles (20).jpg",
    "post sistemas moviles (21).jpg",
  ],
});

const sistemasMovilesCarousels = [
  {
    id: "carousel-sistemas-moviles-1",
    label: "Carrusel 1",
    items: ["carru 1.jpg", "carru 2.jpg"].map((fileName, index) => ({
      id: `carousel-sistemas-moviles-1-${index + 1}`,
      title: fileName,
      type: "carouselSlide",
      src: `${sistemasMovilesAssetSlug}/carruseles/${fileName}`,
      poster: null,
      alt: `Slide ${index + 1} del carrusel de Sistemas Móviles.`,
      width: 1080,
      height: 1350,
      presentation: "raw",
    })),
  },
];

const sistemasMovilesVideos = createStandardVideoSet({
  assetSlug: sistemasMovilesAssetSlug,
  clientName: "Sistemas Móviles",
  clientSlug: "sistemas-moviles",
  files: [
    { fileName: "0810(1)-web-h264.mp4", width: 720, height: 1280 },
    "Copia de sistemas hik vision-web-h264.mp4",
  ],
});

const ramblaStories = createStandardImageSet({
  clientName: "Rambla",
  clientSlug: "rambla",
  type: "story",
  fileNames: [
    "historias rambla (60).jpg",
    "historias rambla (61).jpg",
    "historias rambla (62).jpg",
    "historias rambla (63).jpg",
    "historias rambla (64).jpg",
  ],
});

const ramblaStoryVideo = {
  id: "story-video-rambla-1",
  title: "VIDEO",
  type: "video",
  src: "rambla/stories/historias rambla.mp4",
  poster: null,
  alt: "Video de stories de Rambla.",
  width: 1080,
  height: 1920,
  presentation: "phone",
  audioEnabled: false,
};

const ramblaVideos = createStandardVideoSet({
  clientName: "Rambla",
  clientSlug: "rambla",
  files: [
    "Copia de copy_B191B18E-8D69-40E0-B36C-61C96D1EA930-web-h264.mp4",
    "Copia de rambla 2.0-web-h264.mp4",
    "Copia de Rambla godere video 1-web-h264.mp4",
    {
      fileName: "Copia de video rejunte 1-web-h264.mp4",
      width: 1080,
      height: 1936,
    },
  ],
});

const ramblaBrandBanners = [
  {
    id: "rambla-brand-banner-desktop",
    title: "Banner horizontal de Rambla",
    type: "banner",
    src: "rambla/banners/banner_horizontal.jpeg",
    alt: "PresentaciÃ³n horizontal de la identidad de marca de Rambla.",
    width: 1920,
    height: 700,
    presentation: "raw",
    viewport: "desktop",
    config: { viewport: "desktop" },
  },
  {
    id: "rambla-brand-banner-mobile",
    title: "Banner vertical de Rambla",
    type: "banner",
    src: "rambla/banners/banner_vertical.png",
    alt: "PresentaciÃ³n vertical de la identidad de marca de Rambla.",
    width: 1122,
    height: 1402,
    presentation: "raw",
    viewport: "mobile",
    config: { viewport: "mobile" },
  },
];

const majaVideos = createStandardVideoSet({
  clientName: "Maja",
  clientSlug: "maja",
  files: [
    {
      fileName: "copy_349D56FE-B414-4951-96AF-7B78D52889BF-web-h264.mp4",
      width: 1080,
      height: 1908,
    },
    "copy_75EBDB0E-FA48-4E6B-8826-7A4370218237-web-h264.mp4",
    {
      fileName: "copy_b0a4a16b55120efed5db24eb404cc356-web-h264.mp4",
      width: 720,
      height: 1280,
    },
    {
      fileName: "copy_23CA139B-41CF-4ED6-8F98-FAC3BB8634F4-web-h264.mp4",
      width: 1080,
      height: 1920,
    },
  ],
});

const vectusVideos = [
  "CONSEJOS-web-h264.mp4",
  "Copia de riesgos vectus-web-h264.mp4",
  "Copia de SUMMIT-web-h264.mp4",
  "Copia de VECTUS S21-web-h264.mp4",
  "Copia de webinar-web-h264.mp4",
].map((fileName, index) => ({
  id: `video-vectus-${index + 1}`,
  title: "VIDEO",
  type: "video",
  src: `vectus/videos/${fileName}`,
  poster: null,
  alt: `Video de Vectus ${index + 1}.`,
  width: 1080,
  height: 1920,
  presentation: "reel",
}));

const tardeoStories = [92, 93, 94, 95, 96, 97, 98].map((assetNumber) => ({
  id: `story-tardeo-${assetNumber}`,
  title: `tardeo (${assetNumber}).jpg`,
  type: "story",
  src: `tardeo/edicion 1/stories/tardeo (${assetNumber}).jpg`,
  poster: null,
  alt: `Story de Tardeo, edición 1, pieza ${assetNumber}.`,
  width: 1080,
  height: 1920,
  presentation: "phone",
}));

function createTardeoMediaRow(rowNumber, items) {
  return items.map(({ audioEnabled, fileName }, index) => ({
    id: `tardeo-edicion-1-fila-${rowNumber}-${index + 1}`,
    title: "POST",
    type: "video",
    src: `tardeo/edicion 1/fila ${rowNumber}/${fileName}`,
    poster: null,
    alt: `Pieza audiovisual de Tardeo, edición 1, fila ${rowNumber}, posición ${index + 1}.`,
    width: 1080,
    height: 1920,
    presentation: "strip",
    audioEnabled,
  }));
}

const tardeoMediaRows = [
  createTardeoMediaRow(1, [
    { fileName: "club tardeo max carra-web-h264.mp4", audioEnabled: false },
    { fileName: "jaime tardeo-web-h264.mp4", audioEnabled: false },
    { fileName: "la vuelta banda tardeo-web-h264.mp4", audioEnabled: false },
    { fileName: "mati marquez tardeo-web-h264.mp4", audioEnabled: false },
    { fileName: "tardeo mica marquez-web-h264.mp4", audioEnabled: false },
    { fileName: "tardeo tomi lujan-web-h264.mp4", audioEnabled: false },
  ]),
  createTardeoMediaRow(2, [
    { fileName: "Copia de max carra tardeo-web-h264.mp4", audioEnabled: true },
    { fileName: "tardeo early-web-h264.mp4", audioEnabled: false },
    { fileName: "tardeo final-web-h264.mp4", audioEnabled: false },
  ]),
];

const clientCatalog = [
  {
    slug: "peumax",
    name: "Peumax",
    year: "2024",
    disciplines: ["Repuestos de Automotores"],
    cover: "peumax/logo.jpeg",
    projects: [
      ...peumaxStories,
      ...peumaxPosts,
      ...peumaxCarouselA,
      ...peumaxCarouselB,
    ],
    content: [
      {
        type: "storySequence",
        eyebrow: "INSTAGRAM",
        title: "Stories",
        items: peumaxStories,
      },
      {
        type: "postGrid",
        eyebrow: "REDES SOCIALES",
        title: "Posts",
        items: peumaxPosts,
      },
      {
        type: "carouselPairs",
        eyebrow: "REDES SOCIALES",
        title: "Carruseles",
        items: peumaxCarousels,
      },
    ],
  },
  {
    slug: "aqualand",
    name: "Aqualand",
    year: "2025",
    disciplines: ["Venta de artículos varios"],
    cover: "aqualand/logo.jpg",
    projects: [
      ...aqualandStories,
      ...aqualandPosts,
      ...aqualandCarouselA,
      ...aqualandCarouselB,
    ],
    content: [
      {
        type: "storySequence",
        eyebrow: "INSTAGRAM",
        title: "Stories",
        items: aqualandStories,
      },
      {
        type: "postGrid",
        eyebrow: "REDES SOCIALES",
        title: "Posts",
        items: aqualandPosts,
      },
      {
        type: "carouselPairs",
        eyebrow: "REDES SOCIALES",
        title: "Carruseles",
        items: aqualandCarousels,
      },
      {
        type: "catalogPair",
        eyebrow: "EDITORIAL",
        title: "Catálogos",
        items: aqualandCatalogs,
      },
    ],
  },
  {
    slug: "desnac",
    name: "Desnac",
    year: "2025",
    disciplines: ["Empresa de Software"],
    cover: "desnac/logo.jpg",
    projects: [
      ...desnacStories,
      ...desnacPosts,
      ...desnacCarousels.flatMap((carousel) => carousel.items),
      ...desnacVideos,
    ],
    content: [
      {
        type: "storySequence",
        eyebrow: "INSTAGRAM",
        title: "Stories",
        items: desnacStories,
      },
      {
        type: "postGrid",
        eyebrow: "REDES SOCIALES",
        title: "Posts",
        items: desnacPosts,
      },
      {
        type: "carouselPairs",
        eyebrow: "REDES SOCIALES",
        title: "Carruseles",
        items: desnacCarousels,
      },
      {
        type: "videoStack",
        eyebrow: "REDES SOCIALES",
        title: "Videos",
        items: desnacVideos,
      },
    ],
  },
  {
    slug: "sistemas-moviles",
    name: "Sistemas Móviles",
    year: "2025",
    disciplines: ["Sistemas de Seguridad"],
    cover: "sistemas-moviles/logo.jpg",
    projects: [
      ...sistemasMovilesStories,
      ...sistemasMovilesPosts,
      ...sistemasMovilesCarousels.flatMap((carousel) => carousel.items),
      ...sistemasMovilesVideos,
    ],
    content: [
      {
        type: "storySequence",
        eyebrow: "INSTAGRAM",
        title: "Stories",
        items: sistemasMovilesStories,
      },
      {
        type: "postGrid",
        eyebrow: "REDES SOCIALES",
        title: "Posts",
        items: sistemasMovilesPosts,
      },
      {
        type: "carouselPairs",
        eyebrow: "REDES SOCIALES",
        title: "Carruseles",
        items: sistemasMovilesCarousels,
      },
      {
        type: "videoStack",
        eyebrow: "REDES SOCIALES",
        title: "Videos",
        items: sistemasMovilesVideos,
      },
    ],
  },
  {
    slug: "rambla",
    name: "Rambla",
    year: "2026",
    disciplines: ["Eventos/Entretenimiento"],
    cover: "rambla/logo.jpg",
    projects: [
      ...ramblaBrandBanners,
      ...ramblaStories,
      ramblaStoryVideo,
      ...ramblaVideos,
    ],
    content: [
      {
        id: "rambla-brand-creation",
        type: "banners",
        title: "Creación de marca",
        presentation: "responsiveBanner",
        config: { presentation: "responsiveBanner" },
        items: ramblaBrandBanners,
      },
      {
        id: "rambla-video-story",
        type: "videoStory",
        eyebrow: "INSTAGRAM",
        title: "VideoStory",
        items: [ramblaStoryVideo],
      },
      {
        id: "rambla-stories",
        type: "storySequence",
        eyebrow: "INSTAGRAM",
        title: "Stories",
        items: ramblaStories,
      },
      {
        type: "videoStack",
        eyebrow: "REDES SOCIALES",
        title: "Videos",
        items: ramblaVideos,
      },
    ],
  },
  {
    slug: "maja",
    name: "Maja",
    year: "2024",
    disciplines: ["Estética"],
    cover: "maja/logo.png",
    projects: [...majaVideos],
    content: [
      {
        type: "videoStack",
        eyebrow: "REDES SOCIALES",
        title: "Videos",
        items: majaVideos,
      },
    ],
  },
  {
    slug: "vectus",
    name: "Vectus",
    year: "2025",
    disciplines: ["Ciberseguridad"],
    cover: "vectus/logo.jpg",
    projects: [...vectusVideos],
    content: [
      {
        type: "videoStack",
        eyebrow: "REDES SOCIALES",
        title: "Videos",
        items: vectusVideos,
      },
    ],
  },
  {
    slug: "tardeo",
    name: "Tardeo",
    year: "2026",
    disciplines: ["Eventos/Entretenimiento"],
    cover: "tardeo/logo.jpeg",
    editions: [
      {
        id: "edicion-1",
        label: "Edición 1",
        content: [
          {
            type: "mediaRows",
            eyebrow: "REDES SOCIALES",
            title: "Posts",
            rows: tardeoMediaRows,
          },
          {
            type: "storySequence",
            eyebrow: "INSTAGRAM",
            title: "Stories",
            items: tardeoStories,
          },
        ],
      },
      {
        id: "edicion-2",
        label: "Edición 2",
        comingSoon: true,
      },
    ],
  },
  {
    slug: "el-tori",
    name: "El Tori",
    year: "2026",
    disciplines: ["Restobar"],
    cover: "tori/logo.jpeg",
  },
];

export const CLIENT_SLUG_ORDER = [
  "rambla",
  "aqualand",
  "tardeo",
  "peumax",
  "desnac",
  "sistemas-moviles",
  "vectus",
  "maja",
  "el-tori",
];

export const clients = CLIENT_SLUG_ORDER.map((slug) =>
  clientCatalog.find((client) => client.slug === slug),
);

export function getClientBySlug(slug) {
  return clients.find((client) => client.slug === slug);
}
