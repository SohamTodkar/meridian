import Link from "next/link";

export function SiteFooter() {
  return <footer className="site-footer"><div><p className="eyebrow">Field journal / Issue 01</p><p className="footer-statement">A place to give unfinished thinking a sharper edge.</p></div><div className="footer-links"><Link href="/ideas">All ideas</Link><a href="mailto:hello@example.com">Say hello</a><span>© 2026</span></div></footer>;
}
