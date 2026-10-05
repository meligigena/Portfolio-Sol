import { fetchAdminPortfolioClients } from "../data/portfolioDatabase";
import { createWebImageVariants } from "./imageVariants";
import { getSupabaseBrowserClient } from "../lib/supabase";
import { ABOUT_CONTENT_KEY, fetchAboutContent } from "../data/siteContent";
import {
  allDraftItems,
  buildClientPayload,
  hasAdminDraftChanges,
} from "./adminDraft";
import {
  assertSafeClientSlug,
  IMAGE_MIME_TYPES,
  safeStorageFileName,
  slugifyClientName,
  validateFilesForUpload,
  VIDEO_MIME_TYPES,
} from "./adminValidation";

const BUCKET =
  import.meta.env.VITE_SUPABASE_STORAGE_BUCKET?.trim() || "portfolio-media";

function uniqueToken() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function itemFolder(item, draft) {
  if (draft.stories.includes(item)) return "stories";
  if ((draft.videoStory ?? []).includes(item)) return "video-story";
  if (draft.posts.includes(item)) return "posts";
  if (draft.videos.includes(item)) return "videos";
  if ((draft.banners ?? []).includes(item)) return "banners";

  for (const edition of draft.editionDrafts ?? []) {
    for (const section of edition.sections) {
      if (section.items?.includes(item)) {
        return `ediciones/${edition.editionKey}/${slugifyClientName(section.title)}`;
      }
      const group = section.groups?.find((entry) => entry.items.includes(item));
      if (group) {
        return `ediciones/${edition.editionKey}/${slugifyClientName(section.title)}/${slugifyClientName(group.label)}`;
      }
    }
  }

  const carouselIndex = draft.carousels.findIndex((group) =>
    group.items.includes(item),
  );
  if (carouselIndex >= 0) return `carruseles/carrusel-${carouselIndex + 1}`;

  const catalogIndex = draft.catalogs.findIndex((group) =>
    group.items.includes(item),
  );
  if (catalogIndex >= 0) return `catalogos/catalogo-${catalogIndex + 1}`;

  const customIndex = draft.customSections.findIndex((section) =>
    section.items.includes(item),
  );
  if (customIndex >= 0) {
    const section = draft.customSections[customIndex];
    return `secciones/${slugifyClientName(section.title) || `seccion-${customIndex + 1}`}`;
  }

  throw new Error(`No se pudo resolver la carpeta de ${item.name}.`);
}

function storagePathForItem(storagePrefix, folder, item) {
  return `${storagePrefix}/${folder}/${uniqueToken()}-${safeStorageFileName(item.file.name)}`;
}

async function removeUploaded(storage, paths) {
  if (paths.length === 0) return;
  const { error } = await storage.remove(paths);
  if (error) throw error;
}

function variantPaths(item) {
  return (item?.config?.webVariants ?? []).map((variant) => variant.path);
}

export function variantPath(originalPath, width) {
  return `${originalPath.replace(/\.[^/.]+$/, "")}-web-${width}.webp`;
}

async function uploadPublicMedia(storage, job, uploadedPaths) {
  const { error } = await storage.upload(job.path, job.file, {
    cacheControl: "31536000", contentType: job.file.type, upsert: false,
  });
  if (error) throw new Error(`Falló la subida de ${job.file.name}: ${error.message}`);
  uploadedPaths.push(job.path);
  // Logos are direct client references, not responsive media items.
  if (job.id === "logo" || !job.file.type.startsWith("image/")) return job.path;

  const webVariants = [];
  try {
    const variants = await createWebImageVariants(job.file);
    for (const variant of variants) {
      const path = variantPath(job.path, variant.width);
      const { error: variantError } = await storage.upload(path, variant.blob, {
        cacheControl: "31536000", contentType: "image/webp", upsert: false,
      });
      if (variantError) throw variantError;
      uploadedPaths.push(path);
      webVariants.push({ width: variant.width, path });
    }
  } catch (optimizationError) {
    console.warn(`Web optimization failed for ${job.file.name}; keeping the original.`, optimizationError);
    const partialPaths = webVariants.map((variant) => variant.path);
    try {
      await removeUploaded(storage, partialPaths);
      for (const path of partialPaths) uploadedPaths.splice(uploadedPaths.indexOf(path), 1);
    } catch (cleanupError) {
      // Keep these paths tracked so a later save failure can retry rollback.
      console.warn("Partial web variant cleanup failed.", cleanupError);
    }
    return { original: job.path, webVariants: [] };
  }
  return { original: job.path, webVariants };
}

export function assertScopedPaths(paths, prefix) {
  const safePrefix = `${prefix}/`;
  if (paths.some((path) => !path.startsWith(safePrefix))) {
    throw new Error("Se bloqueó una operación de Storage fuera del cliente seleccionado.");
  }
}

export function createPortfolioAdminService(
  client = getSupabaseBrowserClient(),
) {
  const storage = client.storage.from(BUCKET);

  return {
    async getSession() {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      return data.session;
    },

    onAuthStateChange(callback) {
      const { data } = client.auth.onAuthStateChange((event, session) => {
        callback(session, event);
      });
      return () => data.subscription.unsubscribe();
    },

    async signIn(email, password) {
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return data.session;
    },

    async signOut() {
      const { error } = await client.auth.signOut();
      if (error) throw error;
    },

    async isAdmin(userId) {
      const { data, error } = await client
        .from("portfolio_admins")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return Boolean(data);
    },

    listClients() {
      return fetchAdminPortfolioClients(client);
    },

    async saveClientOrder(clientIds) {
      const { error } = await client.rpc("admin_reorder_portfolio_clients", {
        p_client_ids: clientIds,
      });
      if (error) throw error;
    },

    getAboutContent() {
      return fetchAboutContent(client);
    },

    async saveAboutContent(content) {
      const { data, error } = await client
        .from("portfolio_site_content")
        .update({ content })
        .eq("content_key", ABOUT_CONTENT_KEY)
        .select("content")
        .single();
      if (error) throw error;
      return data.content;
    },

    async saveClient(draft, onProgress = () => {}) {
      const isNew = !draft.id;
      const slug = assertSafeClientSlug(
        draft.slug || slugifyClientName(draft.name),
      );
      const storagePrefix = assertSafeClientSlug(
        draft.storagePrefix ?? slug,
      );
      if (!isNew && !hasAdminDraftChanges(draft)) {
        return { id: draft.id, slug, cleanupWarnings: [] };
      }
      const resolvedPaths = new Map();
      const uploadedPaths = [];
      const newItems = allDraftItems(draft).filter(
        (item) => !item.existing && !item.removed,
      );
      const newFiles = [draft.logo?.file ?? draft.logo, ...newItems.map((item) => item.file)].filter(Boolean);
      const fileErrors = await validateFilesForUpload(newFiles, [
        ...IMAGE_MIME_TYPES,
        ...VIDEO_MIME_TYPES,
      ]);
      if (fileErrors.length > 0) throw new Error(fileErrors[0].message);

      let clientId = draft.id;
      let createdDraft = false;
      let committed = false;
      let sortOrder = draft.sortOrder;

      try {
        if (isNew) {
          const { data: duplicate, error: duplicateError } = await client
            .from("portfolio_clients")
            .select("id")
            .eq("slug", slug)
            .maybeSingle();
          if (duplicateError) throw duplicateError;
          if (duplicate) throw new Error("Ya existe un cliente con ese slug.");

          const { data: maxOrderRows, error: orderError } = await client
            .from("portfolio_clients")
            .select("sort_order")
            .order("sort_order", { ascending: false })
            .limit(1);
          if (orderError) throw orderError;

          sortOrder = (maxOrderRows?.[0]?.sort_order ?? -1) + 1;
          const { data: created, error: createError } = await client
            .from("portfolio_clients")
            .insert({
              slug,
              storage_prefix: storagePrefix,
              name: draft.name.trim(),
              year: String(draft.year).trim(),
              disciplines: [draft.discipline.trim()],
              logo_path: null,
              sort_order: sortOrder,
              published: false,
            })
            .select("id")
            .single();
          if (createError) throw createError;
          clientId = created.id;
          createdDraft = true;
        }

        const uploadJobs = [];
        if (draft.logo) {
          const logoFile = draft.logo.file ?? draft.logo;
          uploadJobs.push({
            id: "logo",
            file: logoFile,
            path: `${storagePrefix}/logo-${uniqueToken()}-${safeStorageFileName(logoFile.name)}`,
            category: "logo",
          });
        }
        newItems.forEach((item) => {
          uploadJobs.push({
            id: item.tempId,
            file: item.file,
            path: storagePathForItem(storagePrefix, itemFolder(item, draft), item),
            category: itemFolder(item, draft).split("/")[0],
          });
        });

        for (let index = 0; index < uploadJobs.length; index += 1) {
          const job = uploadJobs[index];
          onProgress({
            current: index + 1,
            total: uploadJobs.length,
            category: job.category,
            fileName: job.file.name,
          });
          resolvedPaths.set(job.id, await uploadPublicMedia(storage, job, uploadedPaths));
        }

        const payload = buildClientPayload(
          { ...draft, slug, storagePrefix, sortOrder },
          resolvedPaths,
          { changedOnly: !isNew },
        );
        const { error: saveError } = await client.rpc(
          draft.usesEditions
            ? "admin_sync_portfolio_client"
            : "admin_replace_portfolio_client",
          { p_client_id: clientId, p_payload: payload },
        );
        if (saveError) throw saveError;
        committed = true;

        const removedPaths = [
          ...allDraftItems(draft)
            .filter((item) => item.existing && item.removed)
            .flatMap((item) => [item.storagePath, ...variantPaths(item)]),
          ...allDraftItems(draft)
            .flatMap((item) => [item.replacedStoragePath, ...(item.replacedVariantPaths ?? [])])
            .filter(Boolean),
          ...((draft.logo || draft.logoRemoved) && draft.existingLogoPath
            ? [draft.existingLogoPath]
            : []),
        ];
        assertScopedPaths(removedPaths, storagePrefix);
        const cleanupWarnings = [];
        try {
          await removeUploaded(storage, removedPaths);
        } catch (cleanupError) {
          cleanupWarnings.push(
            `Los cambios se guardaron, pero no se pudieron limpiar archivos anteriores: ${cleanupError.message}`,
          );
        }

        return { id: clientId, slug, cleanupWarnings };
      } catch (error) {
        if (committed) throw error;
        try {
          assertScopedPaths(uploadedPaths, storagePrefix);
          await removeUploaded(storage, uploadedPaths);
          if (createdDraft && clientId) {
            await client.from("portfolio_clients").delete().eq("id", clientId);
          }
        } catch (rollbackError) {
          throw new AggregateError(
            [error, rollbackError],
            `${error.message} Además falló el rollback: ${rollbackError.message}`,
            { cause: rollbackError },
          );
        }
        throw error;
      }
    },

    async deleteClient(portfolioClient) {
      const prefix = portfolioClient.storagePrefix ?? portfolioClient.slug;
      const paths = [
        portfolioClient.cover,
        ...(portfolioClient.projects ?? []).flatMap((item) => [item.src, ...variantPaths(item)]),
      ].filter(Boolean);
      const uniquePaths = [...new Set(paths)];
      assertScopedPaths(uniquePaths, prefix);

      const { error: deleteError } = await client.rpc(
        "admin_delete_portfolio_client",
        { p_client_id: portfolioClient.id },
      );
      if (deleteError) {
        throw new Error(
          `No se pudo eliminar la metadata; Storage no fue modificado: ${deleteError.message}`,
        );
      }

      try {
        await removeUploaded(storage, uniquePaths);
      } catch (storageError) {
        throw new Error(
          `El cliente se eliminó de Database, pero quedó pendiente la limpieza de Storage: ${storageError.message}`,
          { cause: storageError },
        );
      }
    },
  };
}

export const portfolioAdminService = {
  getSession: (...args) => createPortfolioAdminService().getSession(...args),
  onAuthStateChange: (...args) =>
    createPortfolioAdminService().onAuthStateChange(...args),
  signIn: (...args) => createPortfolioAdminService().signIn(...args),
  signOut: (...args) => createPortfolioAdminService().signOut(...args),
  isAdmin: (...args) => createPortfolioAdminService().isAdmin(...args),
  listClients: (...args) => createPortfolioAdminService().listClients(...args),
  saveClientOrder: (...args) =>
    createPortfolioAdminService().saveClientOrder(...args),
  getAboutContent: (...args) =>
    createPortfolioAdminService().getAboutContent(...args),
  saveAboutContent: (...args) =>
    createPortfolioAdminService().saveAboutContent(...args),
  saveClient: (...args) => createPortfolioAdminService().saveClient(...args),
  deleteClient: (...args) => createPortfolioAdminService().deleteClient(...args),
};
