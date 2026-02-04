export function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--accent)] text-sm font-semibold text-white shadow-lush">
        <span className="font-heading tracking-[0.18em]">OC</span>
        <span className="absolute -bottom-1 h-1 w-6 rounded-full bg-[color:var(--accent-strong)]" />
      </div>
      <div className="leading-tight">
        <div className="font-heading text-sm uppercase tracking-[0.28em] text-strong">
          OpenClaw
        </div>
        <div className="text-[11px] font-medium text-quiet">
          Mission Control
        </div>
      </div>
    </div>
  );
}
