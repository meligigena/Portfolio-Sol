const DEFAULT_BUCKET = "portfolio-media";

function encodePathSegment(segment) {
  try {
    return encodeURIComponent(decodeURIComponent(segment));
  } catch {
    return encodeURIComponent(segment);
  }
}

function normalizedObjectPath(objectPath) {
  if (typeof objectPath !== "string" || objectPath.trim() === "") {
    throw new TypeError("portfolioMediaUrl requires a non-empty relative path.");
  }

  const normalizedPath = objectPath.replaceAll("\\", "/").replace(/^\/+|\/+$/g, "");
  const segments = normalizedPath.split("/");

  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new TypeError("portfolioMediaUrl requires a safe relative object path.");
  }

  return segments
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    })
    .join("/");
}

export function portfolioMediaUrl(objectPath) {
  const normalizedPath = normalizedObjectPath(objectPath);
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, "");
  const bucket =
    import.meta.env.VITE_SUPABASE_STORAGE_BUCKET?.trim() || DEFAULT_BUCKET;

  if (!supabaseUrl) {
    throw new Error(
      "VITE_SUPABASE_URL is required before portfolio media can use Supabase Storage.",
    );
  }

  const encodedPath = normalizedPath.split("/").map(encodePathSegment).join("/");
  return `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodedPath}`;
}
