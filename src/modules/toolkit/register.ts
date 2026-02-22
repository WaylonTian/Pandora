import { registerTool } from "./plugin-interface";
import { JsonTool } from "./tools/json-tool";
import { TimestampTool } from "./tools/timestamp-tool";
import { Base64Tool } from "./tools/base64-tool";
import { UrlCodecTool } from "./tools/url-codec-tool";
import { UuidTool } from "./tools/uuid-tool";
import { CryptoTool } from "./tools/crypto-tool";
import { IpInfoTool } from "./tools/ip-info-tool";
import { HostsEditorTool } from "./tools/hosts-editor-tool";
import { RegexTool } from "./tools/regex-tool";
import { JwtTool } from "./tools/jwt-tool";
import { ColorTool } from "./tools/color-tool";
import { BaseConverterTool } from "./tools/base-converter-tool";

export function registerAllTools() {
  registerTool({ id: "json", name: "toolkit.jsonTool.title", icon: "{}", category: "text", component: JsonTool });
  registerTool({ id: "timestamp", name: "toolkit.timestampTool.title", icon: "T", category: "text", component: TimestampTool });
  registerTool({ id: "regex", name: "toolkit.regexTool.title", icon: ".*", category: "text", component: RegexTool });
  registerTool({ id: "base64", name: "toolkit.base64Tool.title", icon: "B64", category: "encoding", component: Base64Tool });
  registerTool({ id: "url-codec", name: "toolkit.urlCodecTool.title", icon: "%", category: "encoding", component: UrlCodecTool });
  registerTool({ id: "base-converter", name: "toolkit.baseConverterTool.title", icon: "0x", category: "encoding", component: BaseConverterTool });
  registerTool({ id: "uuid", name: "toolkit.uuidTool.title", icon: "#", category: "other", component: UuidTool });
  registerTool({ id: "color", name: "toolkit.colorTool.title", icon: "🎨", category: "other", component: ColorTool });
  registerTool({ id: "crypto", name: "toolkit.cryptoTool.title", icon: "#!", category: "crypto", component: CryptoTool });
  registerTool({ id: "jwt", name: "toolkit.jwtTool.title", icon: "JWT", category: "crypto", component: JwtTool });
  registerTool({ id: "ip-info", name: "toolkit.ipInfoTool.title", icon: "IP", category: "network", component: IpInfoTool });
  registerTool({ id: "hosts", name: "toolkit.hostsEditorTool.title", icon: "H", category: "network", component: HostsEditorTool });
}
