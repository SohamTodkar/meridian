"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="not-found">
      <p className="eyebrow">A MOMENTARY INTERRUPTION</p>
      <h1>Let’s find our way back.</h1>
      <p>
        Something interrupted this page. Your saved study records are still on
        the server.
      </p>
      <button className="button-primary" onClick={reset}>
        Try this page again
      </button>
    </div>
  );
}
