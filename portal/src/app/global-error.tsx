"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", textAlign: "center" }}>
        <h1>Something went wrong</h1>
        <p>The portal failed to load. Please try again.</p>
        <button onClick={reset} style={{ padding: "0.5rem 1rem" }}>
          Reload
        </button>
      </body>
    </html>
  );
}
