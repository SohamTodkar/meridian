import Link from "next/link";
export default function Login() {
  return (
    <div className="not-found">
      <h1>You’re already in.</h1>
      <p>Your study workspace is ready.</p>
      <Link className="button-primary" href="/">
        Open overview
      </Link>
    </div>
  );
}
