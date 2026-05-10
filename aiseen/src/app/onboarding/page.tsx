import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/actions";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { Zap } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Get started – AISeen" };

export default async function OnboardingPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <Zap className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">AISeen</span>
          </Link>
          <p className="text-sm text-muted-foreground">Let&apos;s get you set up in 2 minutes.</p>
        </div>

        {/* Wizard card */}
        <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
          <OnboardingWizard />
        </div>
      </div>
    </div>
  );
}
