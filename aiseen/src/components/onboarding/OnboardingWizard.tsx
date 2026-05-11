"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Check, ChevronRight, ShoppingBag, Globe, Tag } from "lucide-react";

type Platform = "shopify" | "amazon" | "woocommerce" | "other";

interface StepProps {
  onNext: (data: Partial<WizardData>) => void;
  data: WizardData;
}

interface WizardData {
  platform: Platform | null;
  storeUrl: string;
  brandName: string;
  brandAliases: string;
}

const PLATFORMS: { id: Platform; label: string; description: string }[] = [
  { id: "shopify", label: "Shopify", description: "Connect your Shopify store" },
  { id: "amazon", label: "Amazon", description: "Track your Amazon brand" },
  { id: "woocommerce", label: "WooCommerce", description: "Connect your WooCommerce store" },
  { id: "other", label: "Other / Custom", description: "Enter your store URL manually" },
];

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={cn(
              "h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium border transition-colors",
              i < current
                ? "bg-primary border-primary text-primary-foreground"
                : i === current
                ? "border-primary text-primary"
                : "border-border text-muted-foreground"
            )}
          >
            {i < current ? <Check className="h-3.5 w-3.5" /> : i + 1}
          </div>
          {i < total - 1 && (
            <div className={cn("h-px w-8", i < current ? "bg-primary" : "bg-border")} />
          )}
        </div>
      ))}
    </div>
  );
}

function Step1Platform({ onNext, data }: StepProps) {
  const [selected, setSelected] = useState<Platform | null>(data.platform);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold">Where do you sell?</h2>
        <p className="text-sm text-muted-foreground mt-1">
          We&apos;ll use this to pull your product catalog automatically.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelected(p.id)}
            className={cn(
              "flex flex-col items-start gap-1 rounded-lg border p-4 text-left transition-colors",
              selected === p.id
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:border-primary/50"
            )}
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{p.label}</span>
            </div>
            <span className="text-xs text-muted-foreground">{p.description}</span>
          </button>
        ))}
      </div>

      <Button
        onClick={() => selected && onNext({ platform: selected })}
        disabled={!selected}
        className="w-full"
      >
        Continue <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}

function Step2StoreUrl({ onNext, data }: StepProps) {
  const [url, setUrl] = useState(data.storeUrl);
  const [error, setError] = useState("");

  function validate() {
    const trimmed = url.trim();
    if (!trimmed) { setError("Please enter your store URL."); return; }
    try { new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`); }
    catch { setError("Please enter a valid URL."); return; }
    setError("");
    onNext({ storeUrl: trimmed.startsWith("http") ? trimmed : `https://${trimmed}` });
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold">Your store URL</h2>
        <p className="text-sm text-muted-foreground mt-1">
          We&apos;ll scan your catalog to generate AI monitoring queries.
        </p>
      </div>

      <div className="space-y-2 mb-6">
        <Label htmlFor="store-url" className="flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5" /> Store URL
        </Label>
        <Input
          id="store-url"
          type="url"
          placeholder="https://your-store.myshopify.com"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && validate()}
          className={error ? "border-destructive" : ""}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <Button onClick={validate} className="w-full">
        Continue <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}

function Step3BrandDetails({ onNext, data }: StepProps) {
  const [brandName, setBrandName] = useState(data.brandName);
  const [aliases, setAliases] = useState(data.brandAliases);
  const [error, setError] = useState("");

  function validate() {
    if (!brandName.trim()) { setError("Brand name is required."); return; }
    setError("");
    onNext({ brandName: brandName.trim(), brandAliases: aliases.trim() });
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold">Confirm your brand</h2>
        <p className="text-sm text-muted-foreground mt-1">
          We pre-filled this from your store. Adjust if needed.
        </p>
      </div>

      <div className="space-y-4 mb-6">
        <div className="space-y-2">
          <Label htmlFor="brand-name" className="flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5" /> Brand name
          </Label>
          <Input
            id="brand-name"
            placeholder="Acme Co."
            value={brandName}
            onChange={(e) => { setBrandName(e.target.value); setError(""); }}
            className={error ? "border-destructive" : ""}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="aliases">
            Aliases{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id="aliases"
            placeholder="acmeco, Acme Corporation"
            value={aliases}
            onChange={(e) => setAliases(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Comma-separated nicknames or abbreviations AI models might use.
          </p>
        </div>
      </div>

      <Button onClick={validate} className="w-full">
        Finish setup <Check className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [wizardError, setWizardError] = useState<string | null>(null);
  const [data, setData] = useState<WizardData>({
    platform: null,
    storeUrl: "",
    brandName: "",
    brandAliases: "",
  });

  function advance(partial: Partial<WizardData>) {
    const updated = { ...data, ...partial };
    setData(updated);
    if (step < 2) { setStep(step + 1); return; }

    // Final step — save store to DB
    setWizardError(null);
    startTransition(async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }

        const db = supabase as any;
        const { error } = await db.from("stores").insert({
          user_id: user.id,
          platform: updated.platform === "other" ? "manual" : updated.platform,
          store_url: updated.storeUrl,
          brand_name: updated.brandName,
          brand_aliases: updated.brandAliases
            ? updated.brandAliases.split(",").map((s: string) => s.trim()).filter(Boolean)
            : [],
          is_active: true,
        });

        if (error) {
          setWizardError("Failed to save your store. Please try again.");
          return;
        }

        router.push("/stores");
      } catch {
        setWizardError("Something went wrong. Please try again.");
      }
    });
  }

  const steps = [Step1Platform, Step2StoreUrl, Step3BrandDetails];
  const CurrentStep = steps[step];

  return (
    <div>
      <StepIndicator current={step} total={3} />
      <CurrentStep onNext={advance} data={data} />
      {pending && (
        <p className="text-sm text-muted-foreground text-center mt-4">Setting up your account…</p>
      )}
      {wizardError && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md mt-4 text-center">
          {wizardError}
        </p>
      )}
    </div>
  );
}
