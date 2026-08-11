import { getSupabaseBrowserClient } from "../lib/supabase";

export const ABOUT_CONTENT_KEY = "about";

export async function fetchAboutContent(
  client = getSupabaseBrowserClient(),
) {
  const { data, error } = await client
    .from("portfolio_site_content")
    .select("content_key, content")
    .eq("content_key", ABOUT_CONTENT_KEY)
    .single();

  if (error) throw error;
  return data.content;
}
