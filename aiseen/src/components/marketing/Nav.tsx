"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <Zap className="h-5 w-5 text-primary" fill="currentColor" />
          AISeen
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
            Pricing
          </Link>
          <Link href="/blog" className="text-muted-foreground hover:text-foreground transition-colors">
            Blog
          </Link>
          <Link href="/login" className="text-muted-foreground hover:text-foreground transition-colors">
            Sign in
          </Link>
          <Button asChild size="sm">
            <Link href="/free-audit">Free audit</Link>
          </Button>
        </nav>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden p-2 rounded-md hover:bg-accent"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile nav */}
      {open && (
        <div className="md:hidden border-t border-border px-4 py-4 flex flex-col gap-3 bg-background">
          <Link href="/pricing" className="text-sm py-2" onClick={() => setOpen(false)}>Pricing</Link>
          <Link href="/blog" className="text-sm py-2" onClick={() => setOpen(false)}>Blog</Link>
          <Link href="/login" className="text-sm py-2" onClick={() => setOpen(false)}>Sign in</Link>
          <Button asChild size="sm" className="w-full">
            <Link href="/free-audit" onClick={() => setOpen(false)}>Free audit</Link>
          </Button>
        </div>
      )}
    </header>
  );
}
