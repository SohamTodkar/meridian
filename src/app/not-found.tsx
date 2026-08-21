import Link from "next/link";

export default function NotFound() { return <section className="not-found"><p className="eyebrow">404 / Lost signal</p><h1>This note is not in the archive.</h1><Link className="button-primary" href="/ideas">Browse ideas</Link></section>; }
