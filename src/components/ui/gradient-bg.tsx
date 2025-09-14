export function GradientBackdrop() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 h-screen w-full overflow-hidden bg-background"
    >
      {/* Main ethereal orb - larger and more prominent */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-[60vh] w-[90vw] max-w-3xl rounded-full bg-gradient-to-br from-blue-400/50 via-purple-500/40 to-pink-400/40 blur-3xl animate-pulse" />

      {/* Secondary accent orb - top right */}
      <div className="absolute -top-20 -right-20 h-[40rem] w-[40rem] rounded-full bg-gradient-to-bl from-emerald-400/40 via-cyan-400/30 to-blue-500/30 blur-3xl" />

      {/* Tertiary orb - bottom left */}
      <div className="absolute -bottom-40 -left-40 h-[50rem] w-[50rem] rounded-full bg-gradient-to-tr from-violet-500/35 via-fuchsia-400/25 to-rose-400/20 blur-3xl" />

      {/* Subtle mesh gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-purple-50/30 dark:from-blue-950/40 dark:to-purple-950/40" />

      {/* Dynamic light rays */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-screen bg-gradient-to-b from-transparent via-blue-300/40 to-transparent blur-sm" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-screen bg-gradient-to-b from-transparent via-purple-300/35 to-transparent blur-sm rotate-12" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-screen bg-gradient-to-b from-transparent via-pink-300/35 to-transparent blur-sm -rotate-12" />
    </div>
  );
}