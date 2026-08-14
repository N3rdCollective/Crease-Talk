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
  /** Fill empty bios from Last.fm for all artists (optional Spotify refresh) */
  syncBios?: boolean;
  /** Pull Spotify discography into artist_releases (one artist or all with spotify_id) */
  syncCatalog?: boolean;
  /** One-shot: refresh every artist profile + empty bios + discography */
  syncAll?: boolean;
  /** Re-fetch Spotify even when spotify_id already set */
  force?: boolean;
  /** Overwrite existing bio with Last.fm text */
  forceBio?: boolean;
  /** Force-link a specific Spotify artist ID */
  spotifyId?: string;
  /** Spotify artist URL / URI — parsed into spotifyId */
  spotifyUrl?: string;
  /** Search Spotify artists only (no DB write). Returns candidates. */
  searchQuery?: string;
  searchLimit?: number;
  /** When linking, keep CreaseTalk display name (default false = adopt Spotify) */
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

type SpotifyAlbum = {
  id: string;
  name: string;
  album_type?: string;
  release_date?: string;
  release_date_precision?: string;
  total_tracks?: number;
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

function mapSpotifyFields(
  artist: SpotifyArtist,
  keepName: boolean,
  keepImage: boolean,
) {
  const fields: Record<string, unknown> = {
    spotify_id: artist.id,
    followers: artist.followers?.total ?? 0,
    spotify_url: artist.external_urls?.spotify ?? null,
    updated_at: new Date().toISOString(),
  };
  // Spotify often returns empty genres now — only write when present
  const spotifyGenres = (artist.genres ?? []).filter(Boolean);
  if (spotifyGenres.length > 0) {
    fields.genres = spotifyGenres;
  }
  if (!keepImage) {
    fields.image_url = pickImage(artist);
  }
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

/** Strip Last.fm HTML / "Read more on Last.fm" footnotes from bio text */
function cleanLastFmBio(raw: string | undefined | null): string | null {
  if (!raw?.trim()) return null;
  let text = raw
    .replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  text = text.replace(/\s*Read more on Last\.fm\.?\s*$/i, "").trim();
  if (!text || /^no biography available\.?$/i.test(text)) return null;
  return text;
}

async function fetchSpotifyArtistAlbums(
  token: string,
  spotifyArtistId: string,
): Promise<SpotifyAlbum[]> {
  const albums: SpotifyAlbum[] = [];
  // Spotify currently rejects limit > 10 on this endpoint
  let url: string | null =
    `https://api.spotify.com/v1/artists/${encodeURIComponent(spotifyArtistId)}/albums?include_groups=album%2Csingle&market=US&limit=10`;

  while (url) {
    const res: Response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Spotify albums error (${res.status}): ${text}`);
    }
    const data = await res.json();
    albums.push(...((data?.items ?? []) as SpotifyAlbum[]));
    url = (data?.next as string | null) ?? null;
  }

  // Dedupe by album id (Spotify can return duplicates across markets/groups)
  const seen = new Set<string>();
  return albums.filter((a) => {
    if (!a?.id || seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
}

async function syncArtistCatalog(
  supabase: ReturnType<typeof createClient>,
  token: string,
  artist: { id: string; name: string; spotify_id: string | null },
) {
  if (!artist.spotify_id) {
    throw new Error(`No Spotify ID for "${artist.name}"`);
  }

  const albums = await fetchSpotifyArtistAlbums(token, artist.spotify_id);
  const now = new Date().toISOString();
  const rows = albums.map((a) => ({
    artist_id: artist.id,
    spotify_album_id: a.id,
    name: a.name,
    album_type: (["album", "single", "compilation", "appears_on"].includes(
      a.album_type ?? "",
    )
      ? a.album_type
      : "album") as string,
    release_date: a.release_date ?? null,
    release_date_precision: a.release_date_precision ?? null,
    total_tracks: a.total_tracks ?? 0,
    image_url: pickImage(a as unknown as SpotifyArtist),
    spotify_url: a.external_urls?.spotify ?? null,
    updated_at: now,
  }));

  // Replace catalog snapshot for this artist
  const { error: delError } = await supabase
    .from("artist_releases")
    .delete()
    .eq("artist_id", artist.id);
  if (delError) throw new Error(delError.message);

  if (rows.length > 0) {
    const { error: upsertError } = await supabase
      .from("artist_releases")
      .insert(rows);
    if (upsertError) throw new Error(upsertError.message);
  }

  return { count: rows.length };
}

async function fetchLastFmArtistInfo(
  artistName: string,
  apiKey: string,
): Promise<{ bio: string | null; genres: string[] }> {
  const url = new URL("https://ws.audioscrobbler.com/2.0/");
  url.searchParams.set("method", "artist.getinfo");
  url.searchParams.set("artist", artistName);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("autocorrect", "1");

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Last.fm error (${res.status})`);
  }
  const data = await res.json();
  if (data?.error) {
    // 6 = not found — soft miss
    if (data.error === 6) return { bio: null, genres: [] };
    throw new Error(data.message ?? `Last.fm error ${data.error}`);
  }
  const summary = data?.artist?.bio?.summary as string | undefined;
  const content = data?.artist?.bio?.content as string | undefined;
  const rawTags = (data?.artist?.tags?.tag ?? []) as Array<{
    name?: string;
  }>;
  const genres = normalizeLastFmTags(rawTags.map((t) => t.name ?? ""));
  return {
    bio: cleanLastFmBio(summary) ?? cleanLastFmBio(content),
    genres,
  };
}

/** Map Last.fm tags onto readable genre labels (top tags only). */
function normalizeLastFmTags(tags: string[]): string[] {
  const aliases: Record<string, string> = {
    "hip hop": "Hip Hop",
    "hip-hop": "Hip Hop",
    hiphop: "Hip Hop",
    rap: "Rap",
    "r&b": "R&B",
    rnb: "R&B",
    "rhythm and blues": "R&B",
    "alternative r&b": "Alternative R&B",
    trap: "Trap",
    drill: "Drill",
    "uk drill": "UK Drill",
    grime: "Grime",
    afrobeats: "Afrobeats",
    afrobeat: "Afrobeats",
    amapiano: "Amapiano",
    dancehall: "Dancehall",
    reggae: "Reggae",
    reggaeton: "Reggaeton",
    pop: "Pop",
    "pop rap": "Pop Rap",
    soul: "Soul",
    funk: "Funk",
    jazz: "Jazz",
    electronic: "Electronic",
    edm: "EDM",
    house: "House",
    techno: "Techno",
    indie: "Indie",
    "indie pop": "Indie Pop",
    alternative: "Alternative",
    rock: "Rock",
    metal: "Metal",
    country: "Country",
    folk: "Folk",
    gospel: "Gospel",
    latin: "Latin",
    "lo-fi": "Lo-fi",
    lofi: "Lo-fi",
    "emo rap": "Emo Rap",
    "underground hip hop": "Underground Hip Hop",
    "gangsta rap": "Gangsta Rap",
    "boom bap": "Boom Bap",
    "jersey club": "Jersey Club",
    "uk rap": "UK Rap",
    "seen live": "",
    favorites: "",
    favourite: "",
    "under 2000 listeners": "",
  };

  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of tags) {
    const key = raw.trim().toLowerCase();
    if (!key) continue;
    if (key in aliases) {
      const mapped = aliases[key];
      if (!mapped) continue;
      if (seen.has(mapped.toLowerCase())) continue;
      seen.add(mapped.toLowerCase());
      out.push(mapped);
    } else {
      // Skip noisy meta tags
      if (
        key.includes("listen") ||
        key.includes("favorite") ||
        key.includes("favourite") ||
        key.includes("seen live")
      ) {
        continue;
      }
      const label = raw
        .trim()
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
      if (seen.has(label.toLowerCase())) continue;
      seen.add(label.toLowerCase());
      out.push(label);
    }
    if (out.length >= 5) break;
  }
  return out;
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
    const forceBio = Boolean(body.forceBio);
    // Default: adopt Spotify spelling. Pass keepName:true to preserve CreaseTalk name.
    const keepName = body.keepName === true;
    const lastFmKey = Deno.env.get("LASTFM_API_KEY") ?? "";

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const token = await getSpotifyToken(spotifyClientId, spotifyClientSecret);

    // Pull Spotify discography into artist_releases
    if (body.syncCatalog) {
      let query = supabase
        .from("artists")
        .select("id, name, spotify_id")
        .not("spotify_id", "is", null)
        .order("name", { ascending: true });

      if (body.artistId) {
        query = query.eq("id", body.artistId);
      }

      const { data: rows, error } = await query;
      if (error) return json({ error: error.message }, 500);

      const results = [];
      for (const row of rows ?? []) {
        try {
          const synced = await syncArtistCatalog(supabase, token, row);
          results.push({
            id: row.id,
            name: row.name,
            ok: true,
            releases: synced.count,
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

      return json({
        synced: results.length,
        releases: results.reduce(
          (sum, r) => sum + (r.ok ? (r.releases as number) : 0),
          0,
        ),
        results,
      });
    }

    // One-shot backfill: Spotify profile + Last.fm bio (if empty) + discography
    if (body.syncAll) {
      const { data: rows, error } = await supabase
        .from("artists")
        .select("id, name, spotify_id, image_locked, bio, genres")
        .order("name", { ascending: true });
      if (error) return json({ error: error.message }, 500);

      const results = [];
      for (const row of rows ?? []) {
        try {
          const enriched = await enrichRow(supabase, token, row, {
            force: true,
            keepName: true,
            forceBio,
            lastFmKey,
            fillBio: true,
            fillGenres: true,
          });

          let releases = 0;
          let catalogError: string | null = null;
          if (enriched?.spotify_id) {
            try {
              const synced = await syncArtistCatalog(supabase, token, {
                id: enriched.id,
                name: enriched.name,
                spotify_id: enriched.spotify_id,
              });
              releases = synced.count;
            } catch (catalogErr) {
              catalogError =
                catalogErr instanceof Error
                  ? catalogErr.message
                  : String(catalogErr);
            }
          }

          results.push({
            id: row.id,
            name: row.name,
            ok: true,
            bio: enriched?.bio ?? null,
            releases,
            catalogError,
          });
        } catch (err) {
          results.push({
            id: row.id,
            name: row.name,
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }

        // Soft rate-limit between artists (Spotify / Last.fm)
        await new Promise((resolve) => setTimeout(resolve, 350));
      }

      return json({
        synced: results.length,
        ok: results.filter((r) => r.ok).length,
        withBio: results.filter((r) => r.ok && r.bio).length,
        releases: results.reduce(
          (sum, r) => sum + (r.ok ? Number(r.releases ?? 0) : 0),
          0,
        ),
        lastFmConfigured: Boolean(lastFmKey),
        results,
      });
    }

    // Bulk Last.fm bios for artists missing bio text
    if (body.syncBios) {
      if (!lastFmKey) {
        return json(
          {
            error:
              "Missing LASTFM_API_KEY in Edge Function secrets. Add it in the Supabase dashboard.",
          },
          500,
        );
      }

      let query = supabase
        .from("artists")
        .select("id, name, spotify_id, image_locked, bio, genres")
        .order("name", { ascending: true });

      if (!forceBio) {
        query = query.or("bio.is.null,bio.eq.");
      }

      const { data: rows, error } = await query;
      if (error) return json({ error: error.message }, 500);

      const results = [];
      for (const row of rows ?? []) {
        try {
          const enriched = await enrichRow(supabase, token, row, {
            force,
            keepName: true,
            forceBio,
            lastFmKey,
            fillBio: true,
            fillGenres: true,
          });
          results.push({
            id: row.id,
            name: row.name,
            ok: true,
            bio: enriched?.bio ?? null,
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

      return json({
        synced: results.length,
        filled: results.filter((r) => r.ok && r.bio).length,
        results,
      });
    }

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
        .select("id, name, spotify_id, image_locked, bio, genres")
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
            keepName,
            forceBio,
            lastFmKey,
            fillBio: true,
            fillGenres: true,
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

    // Single artist by id, name, or Spotify link/id (add-artist flow)
    if (!body.artistId && !body.name && !linkedId) {
      return json(
        {
          error:
            "Provide artistId, name, spotifyId/spotifyUrl, syncFeatured:true, or searchQuery in the request body",
        },
        400,
      );
    }

    let row: {
      id: string;
      name: string;
      spotify_id: string | null;
      image_locked: boolean;
      bio: string | null;
    } | null = null;

    if (body.artistId) {
      const { data, error } = await supabase
        .from("artists")
        .select("id, name, spotify_id, image_locked, bio, genres")
        .eq("id", body.artistId)
        .maybeSingle();
      if (error) return json({ error: error.message }, 500);
      row = data;
      if (!row) return json({ error: "Artist not found" }, 404);
    } else {
      // Prefer existing row with this Spotify ID (avoid duplicates on Add)
      if (linkedId) {
        const { data: bySpotify, error: bySpotifyError } = await supabase
          .from("artists")
          .select("id, name, spotify_id, image_locked, bio, genres")
          .eq("spotify_id", linkedId)
          .maybeSingle();
        if (bySpotifyError) {
          return json({ error: bySpotifyError.message }, 500);
        }
        row = bySpotify;
      }

      if (!row && body.name) {
        const name = body.name.trim();
        const { data: existing } = await supabase
          .from("artists")
          .select("id, name, spotify_id, image_locked, bio, genres")
          .ilike("name", name)
          .maybeSingle();

        if (existing) {
          row = existing;
        } else {
          const { data: created, error: createError } = await supabase
            .from("artists")
            .insert({ name, is_featured: false })
            .select("id, name, spotify_id, image_locked, bio, genres")
            .single();
          if (createError) return json({ error: createError.message }, 500);
          row = created;
        }
      } else if (!row && linkedId) {
        const spotifyArtist = await getSpotifyArtist(token, linkedId);
        const { data: created, error: createError } = await supabase
          .from("artists")
          .insert({ name: spotifyArtist.name, is_featured: false })
          .select("id, name, spotify_id, image_locked, bio, genres")
          .single();
        if (createError) return json({ error: createError.message }, 500);
        row = created;
      }
    }

    if (!row) return json({ error: "Unable to resolve artist row" }, 500);

    if (!lastFmKey) {
      console.warn(
        "LASTFM_API_KEY missing — Spotify sync will skip biography",
      );
    }

    const artist = await enrichRow(supabase, token, row, {
      force,
      keepName,
      forcedSpotifyId: linkedId,
      forceBio,
      lastFmKey,
      fillBio: true,
      fillGenres: true,
    });

    // One-shot: also pull discography whenever we enrich a single artist
    let releases = 0;
    let catalogError: string | null = null;
    if (artist?.spotify_id) {
      try {
        const synced = await syncArtistCatalog(supabase, token, {
          id: artist.id,
          name: artist.name,
          spotify_id: artist.spotify_id,
        });
        releases = synced.count;
      } catch (catalogErr) {
        catalogError =
          catalogErr instanceof Error
            ? catalogErr.message
            : String(catalogErr);
        console.error("Catalog sync after enrich failed", catalogError);
      }
    }

    return json({
      artist,
      releases,
      bioFilled: Boolean(artist?.bio?.trim()),
      catalogError,
      lastFmConfigured: Boolean(lastFmKey),
    });
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
  row: {
    id: string;
    name: string;
    spotify_id: string | null;
    image_locked?: boolean | null;
    bio?: string | null;
    genres?: string[] | null;
  },
  options: {
    force: boolean;
    keepName: boolean;
    forcedSpotifyId?: string | null;
    forceBio?: boolean;
    forceGenres?: boolean;
    lastFmKey?: string;
    fillBio?: boolean;
    fillGenres?: boolean;
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
  const fields = mapSpotifyFields(
    spotifyArtist,
    options.keepName,
    Boolean(row.image_locked),
  );

  const displayName = options.keepName
    ? row.name
    : (spotifyArtist.name || row.name);

  const existingGenres = (row.genres ?? []).filter(Boolean);
  const needsBio =
    options.fillBio &&
    options.lastFmKey &&
    (options.forceBio || !row.bio?.trim());
  const needsGenres =
    options.fillGenres &&
    options.lastFmKey &&
    (options.forceGenres ||
      (!existingGenres.length &&
        !(Array.isArray(fields.genres) && fields.genres.length > 0)));

  if ((needsBio || needsGenres) && options.lastFmKey) {
    try {
      const info = await fetchLastFmArtistInfo(displayName, options.lastFmKey);
      if (needsBio && info.bio) fields.bio = info.bio;
      if (needsGenres && info.genres.length > 0) fields.genres = info.genres;
    } catch (lastFmErr) {
      console.error("Last.fm enrich failed", displayName, lastFmErr);
    }
  }

  const { data, error } = await supabase
    .from("artists")
    .update(fields)
    .eq("id", row.id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}
