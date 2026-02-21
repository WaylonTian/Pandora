import { registerTool } from "./plugin-interface";
import { JsonTool } from "./tools/json-tool";
import { TimestampTool } from "./tools/timestamp-tool";
import { Base64Tool } from "./tools/base64-tool";
import { UrlCodecTool } from "./tools/url-codec-tool";
import { UuidTool } from "./tools/uuid-tool";
import { CryptoTool } from "./tools/crypto-tool";
import { IpInfoTool } from "./tools/ip-info-tool";
import { HostsEditorTool } from "./tools/hosts-editor-tool";

export function registerAllTools() {
  registerTool({ id: "json", name: "JSON", icon: "{}", category: "text", component: JsonTool });
  registerTool({ id: "timestamp", name: "时间戳", icon: "T", category: "text", component: TimestampTool });
  registerTool({ id: "base64", name: "Base64", icon: "B64", category: "encoding", component: Base64Tool });
  registerTool({ id: "url-codec", name: "URL 编解码", icon: "%", category: "encoding", component: UrlCodecTool });
  registerTool({ id: "uuid", name: "UUID", icon: "#", category: "other", component: UuidTool });
  registerTool({ id: "crypto", name: "哈希/加密", icon: "#!", category: "crypto", component: CryptoTool });
  registerTool({ id: "ip-info", name: "IP 信息", icon: "IP", category: "network", component: IpInfoTool });
  registerTool({ id: "hosts", name: "Hosts 编辑", icon: "H", category: "network", component: HostsEditorTool });
}