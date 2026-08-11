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

    // Find or create artist
    const artistName = String(submission.artist_name).trim();
    let artistId: string | null = null;

    const { data: existingArtist } = await admin
      .from("artists")
      .select("id")
      .ilike("name", artistName)
      .limit(1)
      .maybeSingle();

    if (existingArtist) {
      artistId = existingArtist.id;
    } else {
      const { data: created, error: createError } = await admin
        .from("artists")
        .insert({ name: artistName })
        .select("id")
        .single();
      if (createError) throw createError;
      artistId = created.id;
    }

    const { data: media, error: mediaError } = await admin
      .from("media_assets")
      .insert({
        artist_id: artistId,
        title: submission.track_title,
        parsed_artist_name: artistName,
        category: "other",
        approval_status: "approved",
        submission_id: submission.id,
        published_at: new Date().toISOString(),
        thumbnail_url: null,
        youtube_video_id: null,
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

    return json({
      ok: true,
      artistId,
      mediaAssetId: media.id,
      submissionId,
    });
  } catch (err) {
    console.error(err);
    return json(
      { error: err instanceof Error ? err.message : "Promote failed" },
      500,
    );
  }
});
