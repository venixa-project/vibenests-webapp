export function BrandMark() {
  return (
    <div className="flex items-center gap-4">
      <div className="relative h-20 w-20 sm:h-24 sm:w-24 xl:h-28 xl:w-28 shrink-0">
        <img src="/image.png" alt="VibeNests Logo" className="h-full w-full object-contain filter drop-shadow-md" />
      </div>
      <div className="leading-tight">
        <div className="font-display text-4xl sm:text-5xl xl:text-6xl font-semibold tracking-wide text-gradient-gold">
          VIBENESTS
        </div>
        <div className="text-xs sm:text-sm tracking-[0.35em] text-muted-foreground uppercase font-medium mt-1">
          Private Luxury Suites
        </div>
      </div>
    </div>
  );
}
