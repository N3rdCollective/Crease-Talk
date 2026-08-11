import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type SpotifyArtist = {
  id: string;
  name: string;
  genres?: string[];
  followers?: { total?: number };
  images?: Array<{ url: string; height?: number; width?: number }>;
  external_urls?: { spotify?: string };
};

type SpotifyTrack = {
  id: string;
  name: string;
  preview_url?: string | null;
  external_urls?: { spotify?: string };
  album?: {
    name?: string;
    images?: Array<{ url: string; height?: number; width?: number }>;
  };
  artists?: Array<{ name: string }>;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getSpotifyToken(clientId: string, clientSecret: string) {
  const basic = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`Spotify token error (${res.status})`);
  const data = await res.json();
  return data.access_token as string;
}

function pickLargestImage(
  images?: Array<{ url: string; height?: number; width?: number }>,
) {
  if (!images?.length) return null;
  // Spotify compliance: use official image URLs unaltered (no crop transforms)
  const sorted = [...images].sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
  return sorted[0]?.url ?? null;
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
      return json({ error: "Missing Spotify secrets" }, 500);
    }
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: "Missing Supabase credentials" }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const artistId = body?.artistId as string | undefined;
    const spotifyIdIn = body?.spotifyId as string | undefined;
    if (!artistId && !spotifyIdIn) {
      return json({ error: "artistId or spotifyId required" }, 400);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    let spotifyId = spotifyIdIn ?? null;
    let local: Record<string, unknown> | null = null;

    if (artistId) {
      const { data, error } = await supabase
        .from("artists")
        .select(
          "id, name, spotify_id, image_url, genres, followers, spotify_url, is_verified, bio",
        )
        .eq("id", artistId)
        .maybeSingle();
      if (error) return json({ error: error.message }, 500);
      if (!data) return json({ error: "Artist not found" }, 404);
      local = data;
      spotifyId = (data.spotify_id as string | null) ?? spotifyId;
    }

    if (!spotifyId) {
      return json({
        artist: local,
        spotify: null,
        topTracks: [],
        warning: "Artist has no Spotify ID yet",
      });
    }

    const token = await getSpotifyToken(spotifyClientId, spotifyClientSecret);
    const [artistRes, tracksRes] = await Promise.all([
      fetch(`https://api.spotify.com/v1/artists/${spotifyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(
        `https://api.spotify.com/v1/artists/${spotifyId}/top-tracks?market=US`,
        { headers: { Authorization: `Bearer ${token}` } },
      ),
    ]);

    if (!artistRes.ok) {
      const text = await artistRes.text();
      return json({ error: `Spotify artist error: ${text}` }, 502);
    }

    const spotifyArtist = (await artistRes.json()) as SpotifyArtist;
    let topTracks: SpotifyTrack[] = [];
    if (tracksRes.ok) {
      const tracksJson = await tracksRes.json();
      topTracks = (tracksJson?.tracks ?? []) as SpotifyTrack[];
    }

    // Refresh local cache lightly (optional; keep display name)
    if (local?.id) {
      await supabase
        .from("artists")
        .update({
          spotify_id: spotifyArtist.id,
          image_url: pickLargestImage(spotifyArtist.images),
          genres: spotifyArtist.genres ?? [],
          followers: spotifyArtist.followers?.total ?? 0,
          spotify_url: spotifyArtist.external_urls?.spotify ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", local.id as string);
    }

    return json({
      artist: local,
      spotify: {
        id: spotifyArtist.id,
        name: spotifyArtist.name,
        genres: spotifyArtist.genres ?? [],
        followers: spotifyArtist.followers?.total ?? 0,
        // Full-resolution Spotify image URL — do not crop/alter in UI
        image_url: pickLargestImage(spotifyArtist.images),
        spotify_url: spotifyArtist.external_urls?.spotify ?? null,
      },
      topTracks: topTracks.slice(0, 10).map((t) => ({
        id: t.id,
        name: t.name,
        preview_url: t.preview_url ?? null,
        spotify_url: t.external_urls?.spotify ?? null,
        album_name: t.album?.name ?? null,
        // Album art as provided by Spotify
        album_image_url: pickLargestImage(t.album?.images),
        artists: (t.artists ?? []).map((a) => a.name).join(", "),
      })),
    });
  } catch (err) {
    return json(
      { error: err instanceof Error ? err.message : String(err) },
      500,
    );
  }
});
