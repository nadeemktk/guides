"use client";

import { useTransition } from "react";
import { signOut } from "@/lib/auth/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface UserMenuProps {
  user: SupabaseUser;
}

export function UserMenu({ user }: UserMenuProps) {
  const [pending, startTransition] = useTransition();

  const initials = (user.user_metadata?.full_name as string | undefined)
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? user.email?.[0]?.toUpperCase() ?? "U";

  return (
    <div className="flex items-center justify-between gap-2 px-2 py-3 border-t border-border">
      <div className="flex items-center gap-2 min-w-0">
        <Avatar className="h-7 w-7 shrink-0">
          <AvatarImage src={user.user_metadata?.avatar_url as string | undefined} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <span className="text-xs text-muted-foreground truncate">
          {(user.user_metadata?.full_name as string | undefined) ?? user.email}
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        disabled={pending}
        onClick={() => startTransition(() => signOut())}
        title="Sign out"
      >
        <LogOut className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
