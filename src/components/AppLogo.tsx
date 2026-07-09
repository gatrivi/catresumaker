import appIcon from "../assets/app_icon.png";

type Props = {
  size?: "sm" | "md" | "lg";
  className?: string;
  showPulse?: boolean;
};

const sizes = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-14 h-14",
};

export default function AppLogo({ size = "md", className = "", showPulse = true }: Props) {
  return (
    <div className={`relative shrink-0 group ${className}`}>
      <img
        src={appIcon}
        alt="CatResumeMaker"
        className={`${sizes[size]} rounded-xl border border-white/20 shadow-lg object-cover bg-slate-950/40 backdrop-blur-sm transform group-hover:scale-105 transition-transform`}
      />
      {showPulse ? (
        <span className="absolute -bottom-0.5 -right-0.5 bg-sky-500 w-2.5 h-2.5 rounded-full border-2 border-slate-900/80 animate-pulse" />
      ) : null}
    </div>
  );
}

export function AppLogoWatermark() {
  return (
    <a
      href="/"
      title="CatResumeMaker"
      className="fixed bottom-4 left-4 z-[60] no-print flex items-center gap-2 glass-logo-chip px-2 py-1.5 rounded-xl hover:scale-[1.02] transition-transform"
    >
      <AppLogo size="sm" showPulse={false} />
      <span className="text-[10px] font-bold text-white/90 tracking-wide hidden sm:inline">CatResumeMaker</span>
    </a>
  );
}
