import { Button } from "@/components/ui/button";

export function DbManager() {
  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">DB Manager</h1>
        <Button>Connect to Database</Button>
      </div>
      
      <div className="flex-1 flex gap-4">
        <div className="w-1/4 border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">Connections</h2>
          <p className="text-sm text-muted-foreground">No connections configured</p>
        </div>
        
        <div className="flex-1 border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">SQL Editor</h2>
          <div className="h-64 bg-muted rounded border">
            <p className="p-4 text-sm text-muted-foreground">SQL editor will be loaded here</p>
          </div>
        </div>
      </div>
      
      <div className="mt-4 text-sm text-muted-foreground">
        Database management functionality migrated from DBLite
      </div>
    </div>
  );
}