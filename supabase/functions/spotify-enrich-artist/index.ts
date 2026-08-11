import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type EnrichBody = {
  /** Enrich a single artist by DB id */
  artistId?: string;
  /** Enrich / upsert by display name */
  name?: string;
  /** Enrich all featured artists missing spotify_id (or force refresh) */
  syncFeatured?: boolean;
  /** Re-fetch Spotify even when spotify_id already set */
  force?: boolean;
  /** Force-link a specific Spotify artist ID */
  spotifyId?: string;
  /** Spotify artist URL / URI — parsed into spotifyId */
  spotifyUrl?: string;
  /** Search Spotify artists only (no DB write). Returns candidates. */
  searchQuery?: string;
  searchLimit?: number;
  /** When linking, keep CreaseTalk display name (default true) */
  keepName?: boolean;
};

type SpotifyTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

type SpotifyArtist = {
  id: string;
  name: string;
  genres?: string[];
  followers?: { total?: number };
  images?: Array<{ url: string; height?: number; width?: number }>;
  external_urls?: { spotify?: string };
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getSpotifyToken(
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const basic = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify token error (${res.status}): ${text}`);
  }

  const data = (await res.json()) as SpotifyTokenResponse;
  return data.access_token;
}

/** Parse open.spotify.com/artist/ID, spotify:artist:ID, or raw ID */
function parseSpotifyArtistId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  const uri = raw.match(/^spotify:artist:([a-zA-Z0-9]+)$/);
  if (uri) return uri[1];

  try {
    const url = new URL(raw);
    if (url.hostname.includes("spotify.com")) {
      const parts = url.pathname.split("/").filter(Boolean);
      const artistIdx = parts.indexOf("artist");
      if (artistIdx >= 0 && parts[artistIdx + 1]) {
        return parts[artistIdx + 1].split("?")[0];
      }
    }
  } catch {
    // not a URL
  }

  if (/^[a-zA-Z0-9]{22}$/.test(raw)) return raw;
  return null;
}

async function searchSpotifyArtists(
  token: string,
  query: string,
  limit = 8,
): Promise<SpotifyArtist[]> {
  const url = new URL("https://api.spotify.com/v1/search");
  url.searchParams.set("q", query);
  url.searchParams.set("type", "artist");
  url.searchParams.set("limit", String(Math.min(Math.max(limit, 1), 20)));

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify search error (${res.status}): ${text}`);
  }

  const data = await res.json();
  return (data?.artists?.items ?? []) as SpotifyArtist[];
}

async function searchSpotifyArtist(
  token: string,
  name: string,
): Promise<SpotifyArtist | null> {
  const items = await searchSpotifyArtists(token, name, 1);
  return items[0] ?? null;
}

async function getSpotifyArtist(
  token: string,
  spotifyId: string,
): Promise<SpotifyArtist> {
  const res = await fetch(`https://api.spotify.com/v1/artists/${spotifyId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify artist error (${res.status}): ${text}`);
  }

  return (await res.json()) as SpotifyArtist;
}

function pickImage(artist: SpotifyArtist): string | null {
  const images = artist.images ?? [];
  if (images.length === 0) return null;
  const sorted = [...images].sort(
    (a, b) => (b.width ?? 0) - (a.width ?? 0),
  );
  return sorted[Math.min(1, sorted.length - 1)]?.url ?? sorted[0]?.url ?? null;
}

function mapSpotifyFields(artist: SpotifyArtist, keepName: boolean) {
  const fields: Record<string, unknown> = {
    spotify_id: artist.id,
    image_url: pickImage(artist),
    genres: artist.genres ?? [],
    followers: artist.followers?.total ?? 0,
    spotify_url: artist.external_urls?.spotify ?? null,
    updated_at: new Date().toISOString(),
  };
  if (!keepName) {
    fields.name = artist.name;
  }
  return fields;
}

function toCandidate(artist: SpotifyArtist) {
  return {
    id: artist.id,
    name: artist.name,
    followers: artist.followers?.total ?? 0,
    genres: artist.genres ?? [],
    image_url: pickImage(artist),
    spotify_url: artist.external_urls?.spotify ?? null,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const spotifyClientId = Deno.env.get("SPOTIFY_CLIENT_ID");
    const spotifyClientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!spotifyClientId || !spotifyClientSecret) {
      return json(
        {
          error:
            "Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET in Edge Function secrets",
        },
        500,
      );
    }
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: "Missing Supabase service credentials" }, 500);
    }

    const body = (await req.json().catch(() => ({}))) as EnrichBody;
    const force = Boolean(body.force);
    const keepName = body.keepName !== false;

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const token = await getSpotifyToken(spotifyClientId, spotifyClientSecret);

    // Search-only mode for admin correction UI
    if (body.searchQuery?.trim()) {
      const items = await searchSpotifyArtists(
        token,
        body.searchQuery.trim(),
        body.searchLimit ?? 8,
      );
      return json({
        query: body.searchQuery.trim(),
        results: items.map(toCandidate),
      });
    }

    const linkedId =
      body.spotifyId?.trim() ||
      (body.spotifyUrl ? parseSpotifyArtistId(body.spotifyUrl) : null);

    if (body.spotifyUrl && !linkedId) {
      return json(
        {
          error:
            "Could not parse Spotify artist from URL. Use open.spotify.com/artist/... or spotify:artist:...",
        },
        400,
      );
    }

    // Sync all featured artists
    if (body.syncFeatured) {
      let query = supabase
        .from("artists")
        .select("id, name, spotify_id")
        .eq("is_featured", true)
        .order("display_order", { ascending: true });

      if (!force) {
        query = query.is("spotify_id", null);
      }

      const { data: rows, error } = await query;
      if (error) return json({ error: error.message }, 500);

      const results = [];
      for (const row of rows ?? []) {
        try {
          const enriched = await enrichRow(supabase, token, row, {
            force,
            keepName: true,
          });
          results.push({
            id: row.id,
            name: row.name,
            ok: true,
            artist: enriched,
          });
        } catch (err) {
          results.push({
            id: row.id,
            name: row.name,
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      return json({ synced: results.length, results });
    }

    // Single artist by id or name
    if (!body.artistId && !body.name) {
      return json(
        {
          error:
            "Provide artistId, name, syncFeatured:true, or searchQuery in the request body",
        },
        400,
      );
    }

    let row: { id: string; name: string; spotify_id: string | null } | null =
      null;

    if (body.artistId) {
      const { data, error } = await supabase
        .from("artists")
        .select("id, name, spotify_id")
        .eq("id", body.artistId)
        .maybeSingle();
      if (error) return json({ error: error.message }, 500);
      row = data;
      if (!row) return json({ error: "Artist not found" }, 404);
    } else if (body.name) {
      const name = body.name.trim();
      const { data: existing } = await supabase
        .from("artists")
        .select("id, name, spotify_id")
        .ilike("name", name)
        .maybeSingle();

      if (existing) {
        row = existing;
      } else {
        const { data: created, error: createError } = await supabase
          .from("artists")
          .insert({ name, is_featured: false })
          .select("id, name, spotify_id")
          .single();
        if (createError) return json({ error: createError.message }, 500);
        row = created;
      }
    }

    if (!row) return json({ error: "Unable to resolve artist row" }, 500);

    const artist = await enrichRow(supabase, token, row, {
      force,
      keepName: linkedId ? keepName : true,
      forcedSpotifyId: linkedId,
    });
    return json({ artist });
  } catch (err) {
    return json(
      { error: err instanceof Error ? err.message : String(err) },
      500,
    );
  }
});

async function enrichRow(
  supabase: ReturnType<typeof createClient>,
  token: string,
  row: { id: string; name: string; spotify_id: string | null },
  options: {
    force: boolean;
    keepName: boolean;
    forcedSpotifyId?: string | null;
  },
) {
  let spotifyId = options.forcedSpotifyId || row.spotify_id;

  // Re-search when forcing without an explicit ID (wrong auto-match)
  if (!spotifyId || (options.force && !options.forcedSpotifyId && !row.spotify_id)) {
    const match = await searchSpotifyArtist(token, row.name);
    if (!match) {
      throw new Error(`No Spotify match for "${row.name}"`);
    }
    spotifyId = match.id;
  } else if (options.force && !options.forcedSpotifyId && row.spotify_id) {
    // force refresh of existing ID
    spotifyId = row.spotify_id;
  }

  if (!spotifyId) {
    const match = await searchSpotifyArtist(token, row.name);
    if (!match) throw new Error(`No Spotify match for "${row.name}"`);
    spotifyId = match.id;
  }

  const spotifyArtist = await getSpotifyArtist(token, spotifyId);
  const fields = mapSpotifyFields(spotifyArtist, options.keepName);
  const { data, error } = await supabase
    .from("artists")
    .update(fields)
    .eq("id", row.id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}
