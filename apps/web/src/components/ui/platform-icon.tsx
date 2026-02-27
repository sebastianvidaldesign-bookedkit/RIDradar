const RedditIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6.066 13.966c.037.2.057.406.057.614 0 3.138-3.653 5.684-8.162 5.684S1.8 17.718 1.8 14.58c0-.209.02-.414.057-.614a1.594 1.594 0 0 1-.634-1.266 1.603 1.603 0 0 1 2.726-1.143 7.82 7.82 0 0 1 4.251-1.39l.8-3.768a.27.27 0 0 1 .32-.208l2.668.564a1.131 1.131 0 1 1-.127.6l-2.39-.506-.713 3.356a7.78 7.78 0 0 1 4.163 1.38 1.603 1.603 0 0 1 2.726 1.143c0 .503-.234.95-.6 1.244zM8.4 13.2a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4zm6.057 3.428a.18.18 0 0 0-.254 0c-.478.478-1.372.72-2.203.72s-1.725-.242-2.203-.72a.18.18 0 0 0-.254.254c.59.59 1.596.847 2.457.847s1.867-.257 2.457-.847a.18.18 0 0 0 0-.254zM15.6 15.6a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4z"/>
  </svg>
);

const RssIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M6.503 20.752c0 1.794-1.456 3.248-3.251 3.248-1.796 0-3.252-1.454-3.252-3.248 0-1.794 1.456-3.248 3.252-3.248 1.795 0 3.251 1.454 3.251 3.248zm-6.503-12.572v4.811c6.05.062 10.96 4.966 11.022 11.009h4.817c-.062-8.71-7.118-15.758-15.839-15.82zm0-8.18v4.819c12.484.074 22.585 10.167 22.659 22.641h4.841c-.074-15.148-12.338-27.404-27.5-27.46z"/>
  </svg>
);

const SearchIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.3-4.3"/>
  </svg>
);

const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const platformConfig: Record<string, { icon: typeof RedditIcon; color: string; label: string }> = {
  reddit: { icon: RedditIcon, color: "text-orange-500", label: "Reddit" },
  rss: { icon: RssIcon, color: "text-amber-500", label: "RSS" },
  search: { icon: SearchIcon, color: "text-blue-500", label: "Search" },
  x: { icon: XIcon, color: "text-gray-900", label: "X" },
};

interface PlatformIconProps {
  platform: string;
  size?: "sm" | "md";
  showLabel?: boolean;
}

export function PlatformIcon({ platform, size = "sm", showLabel = false }: PlatformIconProps) {
  const cfg = platformConfig[platform] || platformConfig.search;
  const Icon = cfg.icon;
  const sizeClass = size === "md" ? "w-5 h-5" : "w-4 h-4";

  return (
    <span className={`inline-flex items-center gap-1.5 ${cfg.color}`}>
      <Icon className={sizeClass} />
      {showLabel && <span className="text-xs font-medium">{cfg.label}</span>}
    </span>
  );
}
