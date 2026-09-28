/** Unlike layout.tsx, a template re-mounts on navigation, so the fade-in replays on every page change. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade-in">{children}</div>;
}
