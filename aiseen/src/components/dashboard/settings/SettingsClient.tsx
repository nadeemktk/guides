"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface Props {
  fullName: string | null;
  email: string;
}

export function SettingsClient({ fullName, email }: Props) {
  const router = useRouter();
  const [name, setName] = useState(fullName ?? "");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleSaveName() {
    if (!name.trim()) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: name.trim() }),
      });
      if (!res.ok) { setSaveMsg("Failed to save — try again"); return; }
      setSaveMsg("Saved");
      router.refresh();
    } catch {
      setSaveMsg("Network error — try again");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete your account? All stores, products, queries, and data will be permanently removed. This cannot be undone.")) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/profile", { method: "DELETE" });
      if (!res.ok) { setDeleteError("Deletion failed — try again or contact support"); return; }
      window.location.href = "/";
    } catch {
      setDeleteError("Network error — try again");
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-sm font-semibold mb-3">Profile</h2>
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full-name" className="text-xs font-medium">Full name</Label>
            <div className="flex gap-2 max-w-sm">
              <Input
                id="full-name"
                className="h-8 text-sm"
                value={name}
                onChange={(e) => { setName(e.target.value); setSaveMsg(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); }}
                placeholder="Your name"
              />
              <Button
                size="sm"
                className="h-8 text-xs"
                onClick={handleSaveName}
                disabled={saving || !name.trim()}
              >
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
            {saveMsg && (
              <p className={`text-xs ${saveMsg === "Saved" ? "text-green-600" : "text-red-500"}`}>
                {saveMsg}
              </p>
            )}
          </div>

          <Separator />

          <div className="space-y-1">
            <Label className="text-xs font-medium">Email</Label>
            <p className="text-sm text-muted-foreground">{email}</p>
            <p className="text-xs text-muted-foreground/60">
              Email cannot be changed here — contact support.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold mb-3">Danger zone</h2>
        <div className="rounded-lg border border-destructive/30 bg-card p-5 space-y-3">
          <div>
            <p className="text-sm font-medium">Delete account</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Permanently delete your account and all associated data. This cannot be undone.
            </p>
          </div>
          {deleteError && (
            <p className="text-xs text-red-500">{deleteError}</p>
          )}
          <Button
            variant="destructive"
            size="sm"
            className="h-8 text-xs"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete my account"}
          </Button>
        </div>
      </section>
    </div>
  );
}
