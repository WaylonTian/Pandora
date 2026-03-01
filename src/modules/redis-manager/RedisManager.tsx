import { AppLayout } from "./components/Layout";
import { ResizableSplit } from "@/components/ResizableSplit";
import { ConnectionList } from "./components/ConnectionList";
import { KeyBrowser } from "./components/KeyBrowser";
import { ValueViewer } from "./components/ValueViewer";
import { CliConsole } from "./components/CliConsole";
import { useRedisStore } from "./store";

export function RedisManager() {
  const activeConnectionId = useRedisStore(s => s.activeConnectionId);

  const sidebar = (
    <div className="h-full flex flex-col">
      <ConnectionList />
      {activeConnectionId && <KeyBrowser />}
    </div>
  );

  const main = activeConnectionId ? (
    <ResizableSplit top={<ValueViewer />} bottom={<CliConsole />} defaultTopRatio={0.65} />
  ) : (
    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
      Select a connection to start
    </div>
  );

  return <AppLayout sidebar={sidebar} main={main} defaultSidebarWidth={260} />;
}
