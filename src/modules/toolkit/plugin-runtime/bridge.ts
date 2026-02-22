import { invoke } from "@tauri-apps/api/core";

interface BridgeOptions {
  pluginId: string;
  onReady?: () => void;
  onResize?: (height: number) => void;
}

export function createPluginBridge({ pluginId, onReady, onResize }: BridgeOptions) {
  const handler = async (e: MessageEvent) => {
    const msg = e.data;
    if (!msg || msg.pluginId !== pluginId) return;

    if (msg.type === "utools-ready") { onReady?.(); return; }
    if (msg.type === "utools-resize") { onResize?.(msg.height); return; }

    if (msg.type === "utools-call") {
      const { id, method, args } = msg;
      try {
        const result = await routeCall(pluginId, method, args);
        (e.source as WindowProxy)?.postMessage({ type: "utools-response", id, result }, { targetOrigin: "*" });
      } catch (err: any) {
        (e.source as WindowProxy)?.postMessage({ type: "utools-response", id, error: err.message || String(err) }, { targetOrigin: "*" });
      }
    }
  };

  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}

async function routeCall(pluginId: string, method: string, args: any[]): Promise<any> {
  switch (method) {
    case "db.put": return invoke("plugin_db_put", { pluginId, doc: args[0] });
    case "db.get": return invoke("plugin_db_get", { pluginId, id: args[0] });
    case "db.remove": return invoke("plugin_db_remove", { pluginId, id: args[0] });
    case "db.bulkDocs": {
      const results = [];
      for (const doc of args[0]) results.push(await invoke("plugin_db_put", { pluginId, doc }));
      return results;
    }
    case "db.allDocs": {
      const arg = args[0];
      if (typeof arg === "string") return invoke("plugin_db_all", { pluginId, prefix: arg });
      if (Array.isArray(arg)) {
        const results = [];
        for (const id of arg) {
          const doc = await invoke("plugin_db_get", { pluginId, id });
          if (doc) results.push(doc);
        }
        return results;
      }
      return invoke("plugin_db_all", { pluginId, prefix: null });
    }
    case "db.postAttachment": return invoke("plugin_db_put_attachment", { pluginId, id: args[0], data: args[1], mime: args[2] });
    case "db.getAttachment": return invoke("plugin_db_get_attachment", { pluginId, id: args[0] });
    case "dbStorage.setItem": return invoke("plugin_db_put", { pluginId, doc: { _id: `_storage/${args[0]}`, value: args[1] } });
    case "dbStorage.getItem": {
      const doc = (await invoke("plugin_db_get", { pluginId, id: `_storage/${args[0]}` })) as any;
      return doc?.value ?? null;
    }
    case "dbStorage.removeItem": return invoke("plugin_db_remove", { pluginId, id: `_storage/${args[0]}` });
    case "copyText": return navigator.clipboard.writeText(args[0]);
    case "shellOpenExternal": return invoke("plugin_open_url", { url: args[0] }).catch(() => window.open(args[0]));
    case "shellOpenPath": return invoke("plugin_open_path", { path: args[0] });
    case "getPath": return invoke("plugin_get_path", { name: args[0] });
    case "showOpenDialog": return invoke("plugin_show_open_dialog", { options: args[0] || {} });
    case "screenCapture": return invoke("plugin_screen_capture");
    case "shellShowItemInFolder": return invoke("plugin_shell_show_item", { path: args[0] });
    case "getCopyedFiles": return [];
    case "fetchUserServerTemporaryToken": return Promise.reject(new Error("Not supported"));
    // Node.js bridge
    case "node.fs.readFile": return invoke("node_fs_read_file", { path: args[0], encoding: args[1] });
    case "node.fs.writeFile": return invoke("node_fs_write_file", { path: args[0], data: args[1] });
    case "node.fs.mkdir": return invoke("node_fs_mkdir", { path: args[0] });
    case "node.fs.readdir": return invoke("node_fs_readdir", { path: args[0] });
    case "node.fs.unlink": return invoke("node_fs_unlink", { path: args[0] });
    case "node.os.homedir": return invoke("node_os_homedir");
    case "node.os.tmpdir": return invoke("node_os_tmpdir");
    case "node.child_process.exec": return invoke("node_exec", { cmd: args[0] });
    case "showSaveDialog": return invoke("plugin_show_save_dialog", { options: args[0] || {} });
    case "shellTrashItem": return invoke("plugin_shell_trash_item", { path: args[0] });
    case "shellBeep": return invoke("plugin_shell_beep");
    case "getNativeId": return invoke("plugin_get_native_id");
    case "getAppName": return invoke("plugin_get_app_name");
    case "isDev": return invoke("plugin_is_dev");
    case "getFileIcon": return invoke("plugin_get_file_icon", { path: args[0] });
    case "getCopyedFiles": return invoke("plugin_get_copyed_files");
    case "hideMainWindowPasteFile": return invoke("plugin_paste_file", { path: args[0] });
    case "hideMainWindowPasteImage": return invoke("plugin_paste_image", { base64: args[0] });
    case "outPlugin": return null;
    case "findInPage": { const iframe = document.querySelector('iframe'); (iframe?.contentWindow as any)?.find?.(args[0]); return null; }
    case "stopFindInPage": { const iframe2 = document.querySelector('iframe'); iframe2?.contentWindow?.getSelection?.()?.removeAllRanges?.(); return null; }
    case "subInputFocus": return null;
    case "subInputBlur": return null;
    case "subInputSelect": return null;
    default:
      console.warn(`[plugin-bridge] Unhandled: ${method}`);
      return null;
  }
}

export function sendPluginEvent(iframe: HTMLIFrameElement, event: string, data: any, pluginId: string) {
  iframe.contentWindow?.postMessage({ type: "utools-event", event, data, pluginId }, "*");
}
