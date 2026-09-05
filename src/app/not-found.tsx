import Link from "next/link";
import { Orbit } from "lucide-react";
export default function NotFound() {
  return (
    <div className="not-found">
      <Orbit size={54} color="var(--accent)" />
      <p className="eyebrow">OUTSIDE THE MAP</p>
      <h1>A small detour.</h1>
      <p>This page isn’t in your learning universe.</p>
      <Link className="button-primary" href="/">
        Back to your observatory
      </Link>
    </div>
  );
}
