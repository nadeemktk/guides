import { notFound } from "next/navigation";
import Link from "next/link";
import { getBlogPost, getBlogSlugs } from "@/lib/blog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

export async function generateStaticParams() {
  return getBlogSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    openGraph: { title: post.title, description: post.description, type: "article" },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      {/* Back */}
      <Link
        href="/blog"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
      >
        <ArrowLeft className="h-3 w-3" /> Back to blog
      </Link>

      {/* Header */}
      <header className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="secondary">{post.category}</Badge>
          <span className="text-xs text-muted-foreground">{post.readTime}</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">{post.title}</h1>
        <p className="text-lg text-muted-foreground mb-4">{post.description}</p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground border-t border-border pt-4">
          <span>{post.author}</span>
          <span>·</span>
          <span>
            {new Date(post.date).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
      </header>

      {/* Content */}
      <article
        className="prose prose-neutral dark:prose-invert max-w-none
          prose-headings:font-semibold prose-headings:tracking-tight
          prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
          prose-code:bg-secondary prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
          prose-pre:bg-secondary prose-pre:border prose-pre:border-border
          prose-a:text-foreground prose-a:underline prose-a:underline-offset-4 hover:prose-a:text-primary
          prose-blockquote:border-l-2 prose-blockquote:border-border prose-blockquote:text-muted-foreground
          prose-table:border-collapse prose-td:border prose-td:border-border prose-th:border prose-th:border-border prose-td:p-2 prose-th:p-2"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      {/* CTA */}
      <div className="mt-12 p-6 rounded-xl border border-border bg-secondary/30 text-center">
        <p className="font-medium mb-2">See how visible your store is to AI assistants</p>
        <p className="text-sm text-muted-foreground mb-4">
          Free audit — results in 90 seconds.
        </p>
        <Button asChild>
          <Link href="/free-audit">
            Run free audit <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
