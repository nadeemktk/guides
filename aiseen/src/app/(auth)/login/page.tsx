import { AuthForm } from "@/components/auth/AuthForm";

export const metadata = {
  title: "Sign in",
  description: "Sign in to your AISeen account.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;
  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold mb-1">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to your AISeen account</p>
      </div>
      <AuthForm mode="login" redirectTo={redirectTo ?? "/overview"} />
    </>
  );
}
