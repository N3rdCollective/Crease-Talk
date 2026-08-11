import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extFromPath(path: string, fallback: string) {
  const base = path.split("/").pop() ?? "";
  const dot = base.lastIndexOf(".");
  if (dot >= 0 && dot < base.length - 1) return base.slice(dot + 1).toLowerCase();
  return fallback;
}

async function copyStorageObject(
  admin: ReturnType<typeof createClient>,
  fromBucket: string,
  fromPath: string,
  toBucket: string,
  toPath: string,
) {
  const { data: blob, error: downloadError } = await admin.storage
    .from(fromBucket)
    .download(fromPath);
  if (downloadError || !blob) {
    throw new Error(
      downloadError?.message ?? `Failed to download ${fromBucket}/${fromPath}`,
    );
  }
  const { error: uploadError } = await admin.storage
    .from(toBucket)
    .upload(toPath, blob, { upsert: true, contentType: blob.type || undefined });
  if (uploadError) throw new Error(uploadError.message);
  const { data } = admin.storage.from(toBucket).getPublicUrl(toPath);
  return data.publicUrl;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: "Server misconfigured" }, 500);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const role = (userData.user.app_metadata?.role as string | undefined) ?? "";
    if (!["webmaster", "admin", "staff"].includes(role)) {
      return json({ error: "Forbidden — staff only" }, 403);
    }

    const body = await req.json();
    const submissionId = body?.submissionId as string | undefined;
    if (!submissionId) {
      return json({ error: "submissionId required" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: submission, error: subError } = await admin
      .from("music_submissions")
      .select("*")
      .eq("id", submissionId)
      .single();

    if (subError || !submission) {
      return json({ error: "Submission not found" }, 404);
    }

    // Idempotent re-approve
    const { data: existingMedia } = await admin
      .from("media_assets")
      .select("id, artist_id")
      .eq("submission_id", submissionId)
      .maybeSingle();

    if (existingMedia) {
      if (submission.status !== "approved") {
        await admin
          .from("music_submissions")
          .update({
            status: "approved",
            reviewed_by: userData.user.id,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", submissionId);
      }
      return json({
        ok: true,
        alreadyPromoted: true,
        artistId: existingMedia.artist_id,
        mediaAssetId: existingMedia.id,
        submissionId,
      });
    }

    const artistName = String(submission.artist_name).trim();
    const genre = submission.genre
      ? String(submission.genre).trim()
      : null;
    const genres = genre ? [genre] : [];
    const spotifyUrl = submission.spotify_url
      ? String(submission.spotify_url).trim()
      : null;
    const instagramUrl = submission.instagram_url
      ? String(submission.instagram_url).trim()
      : null;

    let artistId: string | null = null;
    let createdArtist = false;

    const { data: existingArtist } = await admin
      .from("artists")
      .select("id, image_url, image_locked, genres, spotify_url, instagram_url")
      .ilike("name", artistName)
      .limit(1)
      .maybeSingle();

    if (existingArtist) {
      artistId = existingArtist.id;
      const patch: Record<string, unknown> = {};
      if (instagramUrl && !existingArtist.instagram_url) {
        patch.instagram_url = instagramUrl;
      }
      if (spotifyUrl && !existingArtist.spotify_url) {
        patch.spotify_url = spotifyUrl;
      }
      if (
        genres.length &&
        (!(existingArtist.genres as string[] | null)?.length)
      ) {
        patch.genres = genres;
      }
      if (Object.keys(patch).length) {
        await admin.from("artists").update(patch).eq("id", artistId);
      }
    } else {
      const { data: created, error: createError } = await admin
        .from("artists")
        .insert({
          name: artistName,
          genres,
          spotify_url: spotifyUrl,
          instagram_url: instagramUrl,
          is_featured: false,
        })
        .select("id")
        .single();
      if (createError) throw createError;
      artistId = created.id;
      createdArtist = true;
    }

    if (!artistId) throw new Error("Unable to resolve artist");

    // Copy cover → public promoted-tracks (+ seed artist image if unlocked/empty)
    let coverPath: string | null = null;
    let coverUrl: string | null = null;
    if (submission.cover_file_path) {
      const ext = extFromPath(String(submission.cover_file_path), "jpg");
      coverPath = `${artistId}/${submissionId}/cover.${ext}`;
      coverUrl = await copyStorageObject(
        admin,
        "music-submissions",
        String(submission.cover_file_path),
        "promoted-tracks",
        coverPath,
      );

      const { data: artistRow } = await admin
        .from("artists")
        .select("image_url, image_locked")
        .eq("id", artistId)
        .single();

      if (artistRow && !artistRow.image_locked && !artistRow.image_url) {
        // Also store on artist-images for profile CDN consistency
        const artistImagePath = `${artistId}/submission-cover.${ext}`;
        try {
          const artistImageUrl = await copyStorageObject(
            admin,
            "music-submissions",
            String(submission.cover_file_path),
            "artist-images",
            artistImagePath,
          );
          await admin
            .from("artists")
            .update({ image_url: artistImageUrl, image_locked: true })
            .eq("id", artistId);
        } catch {
          await admin
            .from("artists")
            .update({ image_url: coverUrl, image_locked: true })
            .eq("id", artistId);
        }
      }
    }

    // Copy audio → public promoted-tracks
    let audioPath: string | null = null;
    let audioUrl: string | null = null;
    if (submission.audio_file_path) {
      const ext = extFromPath(String(submission.audio_file_path), "mp3");
      audioPath = `${artistId}/${submissionId}/audio.${ext}`;
      audioUrl = await copyStorageObject(
        admin,
        "music-submissions",
        String(submission.audio_file_path),
        "promoted-tracks",
        audioPath,
      );
    }

    const { data: media, error: mediaError } = await admin
      .from("media_assets")
      .insert({
        artist_id: artistId,
        title: submission.track_title,
        parsed_artist_name: artistName,
        category: "other",
        media_kind: "audio",
        approval_status: "approved",
        submission_id: submission.id,
        published_at: new Date().toISOString(),
        thumbnail_url: coverUrl,
        youtube_video_id: null,
        audio_file_path: audioPath,
        audio_file_url: audioUrl,
        cover_file_path: coverPath,
        cover_file_url: coverUrl,
      })
      .select("id")
      .single();

    if (mediaError) throw mediaError;

    const { error: updateError } = await admin
      .from("music_submissions")
      .update({
        status: "approved",
        reviewed_by: userData.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", submissionId);

    if (updateError) throw updateError;

    // Optional Spotify enrich (name spelling + catalog fields; respects image_locked)
    if (spotifyUrl) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/spotify-enrich-artist`, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            apikey: anonKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            artistId,
            spotifyUrl,
            force: true,
            keepName: false,
          }),
        });
      } catch (enrichErr) {
        console.error("Spotify enrich after promote failed", enrichErr);
      }
    }

    return json({
      ok: true,
      artistId,
      mediaAssetId: media.id,
      submissionId,
      createdArtist,
    });
  } catch (err) {
    console.error(err);
    return json(
      { error: err instanceof Error ? err.message : "Promote failed" },
      500,
    );
  }
});
