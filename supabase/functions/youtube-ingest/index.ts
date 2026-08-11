import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

type ChannelListResponse = {
  items?: Array<{
    id: string;
    contentDetails?: { relatedPlaylists?: { uploads?: string } };
  }>;
};

type PlaylistItemsResponse = {
  items?: Array<{
    contentDetails?: { videoId?: string; videoPublishedAt?: string };
    snippet?: {
      title?: string;
      publishedAt?: string;
      thumbnails?: Record<string, { url?: string }>;
    };
  }>;
};

type VideosResponse = {
  items?: Array<{
    id: string;
    snippet?: {
      title?: string;
      publishedAt?: string;
      thumbnails?: Record<string, { url?: string }>;
    };
    contentDetails?: { duration?: string };
    statistics?: { viewCount?: string };
  }>;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parseIsoDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return (
    Number(match[1] ?? 0) * 3600 +
    Number(match[2] ?? 0) * 60 +
    Number(match[3] ?? 0)
  );
}

function pickThumbnail(
  thumbnails?: Record<string, { url?: string }>,
): string | null {
  return (
    thumbnails?.maxres?.url ||
    thumbnails?.standard?.url ||
    thumbnails?.high?.url ||
    thumbnails?.medium?.url ||
    thumbnails?.default?.url ||
    null
  );
}

function parseVideoTitle(rawTitle: string): {
  artist: string;
  title: string;
  category: "performance" | "interview" | "other";
} {
  const lower = rawTitle.toLowerCase();
  let category: "performance" | "interview" | "other" = "other";
  if (lower.includes("interview")) category = "interview";
  else if (lower.includes("performance") || lower.includes("live")) {
    category = "performance";
  }

  const quoted = rawTitle.match(/^(.+?)\s+[“"](.+?)[”"]/);
  if (quoted) {
    return {
      artist: quoted[1].trim(),
      title: quoted[2].trim(),
      category: category === "other" ? "performance" : category,
    };
  }

  const cleaned = rawTitle
    .replace(/\s*[-|–]\s*Crease\s*Talk.*$/i, "")
    .replace(/\s*Crease\s*Talk\s*(Performance|Interview)?.*$/i, "")
    .trim();

  return {
    artist: "Crease Talk",
    title: cleaned || rawTitle,
    category,
  };
}

async function youtubeGet<T>(
  apiKey: string,
  path: string,
  params: Record<string, string>,
): Promise<T> {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("key", apiKey);
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`YouTube API error (${res.status}): ${body}`);
  }
  return res.json() as Promise<T>;
}

async function assertAuthorized(req: Request): Promise<Response | null> {
  const cronSecret = Deno.env.get("INGEST_CRON_SECRET");
  const headerSecret = req.headers.get("x-cron-secret");
  if (cronSecret && headerSecret && headerSecret === cronSecret) {
    return null;
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    return json({ error: "Server misconfigured" }, 500);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error } = await userClient.auth.getUser();
  if (error || !userData.user) {
    return json({ error: "Unauthorized" }, 401);
  }

  const role = (userData.user.app_metadata?.role as string | undefined) ?? "";
  if (!["webmaster", "admin", "staff"].includes(role)) {
    return json({ error: "Forbidden — staff only" }, 403);
  }

  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const denied = await assertAuthorized(req);
    if (denied) return denied;

    const apiKey = Deno.env.get("YOUTUBE_API_KEY");
    const handle = (
      Deno.env.get("YOUTUBE_CHANNEL_HANDLE") || "creasetalk"
    ).replace(/^@/, "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!apiKey || !supabaseUrl || !serviceRoleKey) {
      return json({ error: "Missing YOUTUBE_API_KEY or Supabase env" }, 500);
    }

    let maxResults = 50;
    try {
      const body = await req.json();
      if (typeof body?.maxResults === "number") {
        maxResults = Math.min(Math.max(body.maxResults, 1), 50);
      }
    } catch {
      // empty body ok
    }

    const channels = await youtubeGet<ChannelListResponse>(apiKey, "channels", {
      part: "contentDetails",
      forHandle: handle,
    });
    const uploadsId =
      channels.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsId) {
      return json({ error: `No uploads playlist for @${handle}` }, 404);
    }

    const playlist = await youtubeGet<PlaylistItemsResponse>(
      apiKey,
      "playlistItems",
      {
        part: "snippet,contentDetails",
        playlistId: uploadsId,
        maxResults: String(maxResults),
      },
    );

    const items = playlist.items || [];
    const ids = items
      .map((item) => item.contentDetails?.videoId)
      .filter((id): id is string => Boolean(id));

    if (ids.length === 0) {
      return json({ inserted: 0, updated: 0, skipped: 0, total: 0 });
    }

    const videos = await youtubeGet<VideosResponse>(apiKey, "videos", {
      part: "snippet,contentDetails,statistics",
      id: ids.join(","),
    });
    const byId = new Map((videos.items || []).map((v) => [v.id, v]));

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Load artists for name matching
    const { data: artists } = await supabase
      .from("artists")
      .select("id, name");
    const artistByName = new Map(
      (artists || []).map((a) => [a.name.trim().toLowerCase(), a.id as string]),
    );

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const item of items) {
      const videoId = item.contentDetails?.videoId;
      if (!videoId) continue;
      const video = byId.get(videoId);
      const rawTitle =
        video?.snippet?.title || item.snippet?.title || "Untitled";
      const parsed = parseVideoTitle(rawTitle);
      const artistId =
        artistByName.get(parsed.artist.toLowerCase()) ?? null;

      const row = {
        youtube_video_id: videoId,
        title: parsed.title,
        parsed_artist_name: parsed.artist,
        artist_id: artistId,
        thumbnail_url:
          pickThumbnail(video?.snippet?.thumbnails) ||
          pickThumbnail(item.snippet?.thumbnails),
        published_at:
          item.contentDetails?.videoPublishedAt ||
          video?.snippet?.publishedAt ||
          item.snippet?.publishedAt ||
          null,
        duration_seconds: parseIsoDuration(
          video?.contentDetails?.duration || "",
        ),
        view_count: Number(video?.statistics?.viewCount || 0),
        category: parsed.category,
      };

      const { data: existing } = await supabase
        .from("media_assets")
        .select("id, approval_status")
        .eq("youtube_video_id", videoId)
        .maybeSingle();

      if (existing) {
        // Refresh metadata but never overwrite approval_status
        const { error } = await supabase
          .from("media_assets")
          .update({
            title: row.title,
            parsed_artist_name: row.parsed_artist_name,
            artist_id: row.artist_id ?? undefined,
            thumbnail_url: row.thumbnail_url,
            published_at: row.published_at,
            duration_seconds: row.duration_seconds,
            view_count: row.view_count,
            category: row.category,
          })
          .eq("id", existing.id);
        if (error) throw error;
        updated += 1;
      } else {
        const { error } = await supabase.from("media_assets").insert({
          ...row,
          approval_status: "pending",
        });
        if (error) throw error;
        inserted += 1;
      }
    }

    return json({
      ok: true,
      handle,
      inserted,
      updated,
      skipped,
      total: ids.length,
    });
  } catch (err) {
    console.error(err);
    return json(
      { error: err instanceof Error ? err.message : "Ingest failed" },
      500,
    );
  }
});
