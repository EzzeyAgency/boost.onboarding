"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

export default function BrandHeader({ signOut }: { signOut?: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <header className="brand-header">
      <Link href="/" className="brand-logo" aria-label="BOOST onboarding home">
        <img src="/ezzey-logo.jpg" alt="Ezzey" width={84} height={44} />
        <span className="brand-divider" />
        <span className="brand-product">BOOST ONBOARDING</span>
      </Link>
      <nav className="brand-nav" aria-label="Primary navigation">
        <Link className={pathname === "/" ? "active" : ""} href="/">Onboarding</Link>
        <Link className={pathname === "/support" ? "active" : ""} href="/support">Get help</Link>
        {signOut}
        <a href="https://ezzey.com/" target="_blank" rel="noreferrer" className="site-link">Ezzey.com <ArrowUpRight size={14} /></a>
      </nav>
    </header>
  );
}
