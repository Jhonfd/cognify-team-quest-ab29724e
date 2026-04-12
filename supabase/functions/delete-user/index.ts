import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RequestSchema = z.object({
  user_id: z.string().uuid().optional(),
  email: z.string().email().optional(),
  preserve_email: z.string().email().optional(),
  cleanup_orphans: z.boolean().optional(),
}).refine(
  (value) => Boolean(value.user_id || value.email || value.cleanup_orphans),
  { message: "user_id, email o cleanup_orphans es requerido" }
);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "No authorization" }, 401);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user: caller },
    } = await supabaseUser.auth.getUser();

    if (!caller) {
      return json({ error: "Unauthorized" }, 401);
    }

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return json({ error: "Admin only" }, 403);
    }

    const parsed = RequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return json({ error: parsed.error.flatten() }, 400);
    }

    const { user_id, email, cleanup_orphans, preserve_email } = parsed.data;

    const deletePublicData = async (targetUserId: string) => {
      const [quizResultsResponse, rolesResponse, profilesResponse] = await Promise.all([
        supabaseAdmin.from("quiz_results").delete().eq("user_id", targetUserId),
        supabaseAdmin.from("user_roles").delete().eq("user_id", targetUserId),
        supabaseAdmin.from("profiles").delete().eq("user_id", targetUserId),
      ]);

      const deleteErrors = [quizResultsResponse.error, rolesResponse.error, profilesResponse.error].filter(Boolean);
      if (deleteErrors.length > 0) {
        throw new Error(deleteErrors.map((err) => err?.message).join(" | "));
      }
    };

    const deleteAuthUser = async (targetUserId: string) => {
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId, false);

      if (!authDeleteError) {
        return;
      }

      const message = authDeleteError.message.toLowerCase();
      if (message.includes("not found") || message.includes("user not found")) {
        return;
      }

      throw new Error(authDeleteError.message);
    };

    const deleteUserData = async (targetUserId: string) => {
      await deleteAuthUser(targetUserId);
      await deletePublicData(targetUserId);
    };

    if (cleanup_orphans) {
      let page = 1;
      const perPage = 1000;
      const authUsers: Array<{ id: string; email?: string | null }> = [];

      while (true) {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
        if (error) {
          throw new Error(error.message);
        }

        const users = data?.users ?? [];
        authUsers.push(...users.map((user) => ({ id: user.id, email: user.email })));

        if (users.length < perPage) break;
        page += 1;
      }

      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from("profiles")
        .select("user_id, email");

      if (profilesError) {
        throw new Error(profilesError.message);
      }

      const profileIds = new Set((profiles ?? []).map((profile) => profile.user_id));
      const profileEmails = new Set((profiles ?? []).map((profile) => profile.email));

      const candidates = authUsers.filter((user) => {
        if (!user.email) return false;
        if (preserve_email && user.email === preserve_email) return false;
        if (profileIds.has(user.id)) return false;
        if (profileEmails.has(user.email)) return false;
        return true;
      });

      for (const candidate of candidates) {
        await deleteUserData(candidate.id);
      }

      return json({ success: true, deleted_users: candidates });
    }

    let targetUserId = user_id;

    if (!targetUserId && email) {
      let page = 1;
      const perPage = 1000;

      while (!targetUserId) {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
        if (error) {
          throw new Error(error.message);
        }

        const users = data?.users ?? [];
        const found = users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
        if (found) {
          targetUserId = found.id;
          break;
        }

        if (users.length < perPage) break;
        page += 1;
      }
    }

    if (!targetUserId) {
      return json({ error: "User not found" }, 404);
    }

    await deleteUserData(targetUserId);
    return json({ success: true, user_id: targetUserId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return json({ error: message }, 500);
  }
});
