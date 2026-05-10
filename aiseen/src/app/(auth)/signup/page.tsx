import { AuthForm } from "@/components/auth/AuthForm";

export const metadata = {
  title: "Create account",
  description: "Start tracking your AI search visibility for free.",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  void plan; // reserved for post-signup billing redirect

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold mb-1">Create your account</h1>
        <p className="text-sm text-muted-foreground">
          14-day free trial · No credit card required
        </p>
      </div>
      <AuthForm mode="signup" redirectTo="/onboarding" />
    </>
  );
}
