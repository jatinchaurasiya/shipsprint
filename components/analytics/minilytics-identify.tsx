"use client";

import { useEffect } from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export function MinilyticsIdentify() {
  useEffect(() => {
    try {
      const supabase = createClient();

      supabase.auth
        .getUser()
        .then((res: { data: { user: User | null } }) => {
          const user = res.data.user;
          if (user) {
            window.minilytics?.("identify", {
              user_id: user.id,
              email: user.email,
              name:
                (user.user_metadata?.name as string | undefined) ??
                (user.user_metadata?.full_name as string | undefined) ??
                undefined,
            });
          }
        })
        .catch(() => {
          // Gracefully ignore in unconfigured environments or during network issues
        });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(
        (event: AuthChangeEvent, session: Session | null) => {
          if (
            session?.user &&
            (event === "SIGNED_IN" ||
              event === "INITIAL_SESSION" ||
              event === "USER_UPDATED")
          ) {
            window.minilytics?.("identify", {
              user_id: session.user.id,
              email: session.user.email,
              name:
                (session.user.user_metadata?.name as string | undefined) ??
                (session.user.user_metadata?.full_name as string | undefined) ??
                undefined,
            });
          }
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    } catch {
      // Guard against environments where Supabase credentials are unavailable
    }
  }, []);

  return null;
}
