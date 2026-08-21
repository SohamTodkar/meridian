"use client";

import Link from "next/link";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ThemeToggle } from "@/components/shared/theme-toggle";

const links = [{ href: "/", label: "Index" }, { href: "/ideas", label: "Ideas" }, { href: "/ideas?tag=Practice", label: "Practice" }];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return <header className="site-header"><div className="site-header-inner"><Link href="/" className="wordmark" aria-label="Ideas home"><span className="wordmark-mark">I</span><span>Ideas</span><sup>01</sup></Link><button className="menu-button" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="site-menu">{open ? <X size={18} /> : <Menu size={18} />}<span className="sr-only">Toggle navigation</span></button><nav id="site-menu" className={`site-nav ${open ? "is-open" : ""}`} aria-label="Primary navigation">{links.map((link) => <Link key={link.href} onClick={() => setOpen(false)} className={pathname === link.href.split("?")[0] ? "is-active" : ""} href={link.href}>{link.label}</Link>)}<a href="mailto:hello@example.com">Contact <ArrowUpRight size={13} /></a><ThemeToggle /></nav></div></header>;
}
