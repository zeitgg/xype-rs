export function EndOfSupportNotice() {
  return (
    <aside
      aria-label="End of support notice"
      className="shrink-0 border-b border-amber-400/20 bg-amber-400/[0.08] px-3 py-2 text-amber-50"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-1 text-xs leading-5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <p className="font-semibold">End of support notice</p>
        <p className="text-amber-50/82">
          xype is no longer actively maintained because the company in Germany has closed. The app may return in
          the future, but no support, fixes, or updates are currently planned.
        </p>
      </div>
    </aside>
  );
}
