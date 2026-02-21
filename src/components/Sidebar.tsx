interface SidebarProps {
  onPanelSelect: (panelId: string) => void;
  activePanel: string | null;
  onThemeToggle: () => void;
  isDark: boolean;
}

const modules = [
  { id: "api-tester", label: "API Tester", icon: "🚀" },
  { id: "db-manager", label: "DB Manager", icon: "🗄️" },
  { id: "toolkit", label: "Toolkit", icon: "🛠️" },
  { id: "script-runner", label: "Script Runner", icon: "▶️" },
];

export function Sidebar({ onPanelSelect, activePanel, onThemeToggle, isDark }: SidebarProps) {
  return (
    <div className="w-12 bg-background border-r border-border flex flex-col items-center py-2 shrink-0">
      {modules.map(m => (
        <button
          key={m.id}
          onClick={() => onPanelSelect(m.id)}
          title={m.label}
          className={`w-10 h-10 flex items-center justify-center rounded mb-1 text-lg ${
            activePanel === m.id ? "bg-accent" : "hover:bg-accent/50"
          }`}
        >
          {m.icon}
        </button>
      ))}
      <div className="flex-1" />
      <button
        onClick={onThemeToggle}
        title={isDark ? "Light mode" : "Dark mode"}
        className="w-10 h-10 flex items-center justify-center rounded hover:bg-accent/50 text-lg"
      >
        {isDark ? "☀️" : "🌙"}
      </button>
    </div>
  );
}