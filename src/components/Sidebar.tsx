import { useI18nStore } from "@/i18n";

interface SidebarProps {
  onPanelSelect: (panelId: string) => void;
  activePanel: string | null;
  onThemeToggle: () => void;
  isDark: boolean;
}

const SendIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m3 3 3 9-3 9 19-9Z"/>
    <path d="m6 12 13 0"/>
  </svg>
);

const DatabaseIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
    <ellipse cx="12" cy="5" rx="9" ry="3"/>
    <path d="m3 5 0 14c0 3 4 3 9 3s9 0 9-3V5"/>
    <path d="m3 12c0 3 4 3 9 3s9 0 9-3"/>
  </svg>
);

const WrenchIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
  </svg>
);

const TerminalIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="4,17 10,11 4,5"/>
    <line x1="12" x2="20" y1="19" y2="19"/>
  </svg>
);

const RedisIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m12 2-8 4.5v11L12 22l8-4.5v-11Z"/>
    <path d="m12 22v-11"/>
    <path d="m20 6.5-8 4.5-8-4.5"/>
  </svg>
);

const SunIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="4"/>
    <path d="m12 2v2"/>
    <path d="m12 20v2"/>
    <path d="m4.93 4.93 1.41 1.41"/>
    <path d="m17.66 17.66 1.41 1.41"/>
    <path d="m2 12h2"/>
    <path d="m20 12h2"/>
    <path d="m6.34 17.66-1.41 1.41"/>
    <path d="m19.07 4.93-1.41 1.41"/>
  </svg>
);

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
  </svg>
);

const modules = [
  { id: "api-tester", label: "API Tester", icon: SendIcon },
  { id: "db-manager", label: "DB Manager", icon: DatabaseIcon },
  { id: "toolkit", label: "Toolkit", icon: WrenchIcon },
  { id: "script-runner", label: "Script Runner", icon: TerminalIcon },
  { id: "redis-manager", label: "Redis Manager", icon: RedisIcon },
];

export function Sidebar({ onPanelSelect, activePanel, onThemeToggle, isDark }: SidebarProps) {
  const { locale, setLocale } = useI18nStore();
  return (
    <div className="w-12 bg-background border-r border-border flex flex-col items-center py-2 shrink-0">
      {modules.map(m => {
        const Icon = m.icon;
        const isActive = activePanel === m.id;
        return (
          <button
            key={m.id}
            onClick={() => onPanelSelect(m.id)}
            title={m.label}
            className={`w-10 h-10 flex items-center justify-center rounded-md mb-1 cursor-pointer transition-all duration-150 focus:ring-2 focus:ring-ring relative ${
              isActive 
                ? "bg-accent/10 text-primary border-l-2 border-blue-500" 
                : "hover:bg-muted text-muted-foreground"
            }`}
          >
            <Icon />
          </button>
        );
      })}
      <div className="flex-1" />
      <button
        onClick={() => setLocale(locale === "zh" ? "en" : "zh")}
        title={locale === "zh" ? "English" : "中文"}
        className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-muted cursor-pointer transition-all duration-150 focus:ring-2 focus:ring-ring text-muted-foreground mb-1 text-xs font-bold"
      >
        {locale === "zh" ? "EN" : "中"}
      </button>
      <button
        onClick={onThemeToggle}
        title={isDark ? "Light mode" : "Dark mode"}
        className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-muted cursor-pointer transition-all duration-150 focus:ring-2 focus:ring-ring text-muted-foreground mb-2"
      >
        {isDark ? <SunIcon /> : <MoonIcon />}
      </button>
      <div className="w-6 h-6 flex items-center justify-center text-xs font-bold text-muted-foreground">
        P
      </div>
    </div>
  );
}