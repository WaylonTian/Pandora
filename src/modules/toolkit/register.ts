import { registerTool } from "./plugin-interface";
import { JsonTool } from "./tools/json-tool";
import { TimestampTool } from "./tools/timestamp-tool";
import { Base64Tool } from "./tools/base64-tool";
import { UrlCodecTool } from "./tools/url-codec-tool";
import { HashTool } from "./tools/hash-tool";
import { ColorTool } from "./tools/color-tool";
import { GeneratorTool } from "./tools/generator-tool";
import { IpInfoTool } from "./tools/ip-info-tool";
import { HostsEditorTool } from "./tools/hosts-editor-tool";
import { RegexTool } from "./tools/regex-tool";
import { JwtTool } from "./tools/jwt-tool";
import { UnicodeTool } from "./tools/unicode-tool";
import { EncryptTool } from "./tools/encrypt-tool";
import { TextProcessTool } from "./tools/text-process-tool";
import { DiffTool } from "./tools/diff-tool";
import { QrcodeTool } from "./tools/qrcode-tool";
import { CronTool } from "./tools/cron-tool";
import { PortTool } from "./tools/port-tool";
import { ImageTool } from "./tools/image-tool";
import { EnvViewerTool } from "./tools/env-viewer-tool";
import {
  Braces, Clock, Regex, FileCode2, Link, Fingerprint, Palette, Hash, KeyRound, Globe, FileEdit,
  Type, Lock, CaseSensitive, GitCompare, QrCode, Timer, Network, ImageIcon, Terminal,
} from "lucide-react";

export function registerAllTools() {
  // Encoding
  registerTool({ id: "base64", name: "toolkit.base64Tool.title", description: "toolkit.base64Tool.desc", icon: FileCode2, category: "encoding", component: Base64Tool });
  registerTool({ id: "url-codec", name: "toolkit.urlCodecTool.title", description: "toolkit.urlCodecTool.desc", icon: Link, category: "encoding", component: UrlCodecTool });
  registerTool({ id: "unicode", name: "toolkit.unicodeTool.title", description: "toolkit.unicodeTool.desc", icon: Type, category: "encoding", component: UnicodeTool });
  registerTool({ id: "hash", name: "toolkit.hashTool.title", description: "toolkit.hashTool.desc", icon: Hash, category: "encoding", component: HashTool });
  registerTool({ id: "encrypt", name: "toolkit.encryptTool.title", description: "toolkit.encryptTool.desc", icon: Lock, category: "encoding", component: EncryptTool });
  registerTool({ id: "jwt", name: "toolkit.jwtTool.title", description: "toolkit.jwtTool.desc", icon: KeyRound, category: "encoding", component: JwtTool });
  // Text
  registerTool({ id: "json", name: "toolkit.jsonTool.title", description: "toolkit.jsonTool.desc", icon: Braces, category: "text", component: JsonTool });
  registerTool({ id: "text-process", name: "toolkit.textProcessTool.title", description: "toolkit.textProcessTool.desc", icon: CaseSensitive, category: "text", component: TextProcessTool });
  registerTool({ id: "diff", name: "toolkit.diffTool.title", description: "toolkit.diffTool.desc", icon: GitCompare, category: "text", component: DiffTool });
  registerTool({ id: "regex", name: "toolkit.regexTool.title", description: "toolkit.regexTool.desc", icon: Regex, category: "text", component: RegexTool });
  // Generator
  registerTool({ id: "generator", name: "toolkit.generatorTool.title", description: "toolkit.generatorTool.desc", icon: Fingerprint, category: "generator", component: GeneratorTool });
  registerTool({ id: "qrcode", name: "toolkit.qrcodeTool.title", description: "toolkit.qrcodeTool.desc", icon: QrCode, category: "generator", component: QrcodeTool });
  registerTool({ id: "color", name: "toolkit.colorTool.title", description: "toolkit.colorTool.desc", icon: Palette, category: "generator", component: ColorTool });
  registerTool({ id: "timestamp", name: "toolkit.timestampTool.title", description: "toolkit.timestampTool.desc", icon: Clock, category: "generator", component: TimestampTool });
  registerTool({ id: "cron", name: "toolkit.cronTool.title", description: "toolkit.cronTool.desc", icon: Timer, category: "generator", component: CronTool });
  // Network
  registerTool({ id: "ip-info", name: "toolkit.ipInfoTool.title", description: "toolkit.ipInfoTool.desc", icon: Globe, category: "network", component: IpInfoTool });
  registerTool({ id: "hosts", name: "toolkit.hostsEditorTool.title", description: "toolkit.hostsEditorTool.desc", icon: FileEdit, category: "network", component: HostsEditorTool });
  registerTool({ id: "port", name: "toolkit.portTool.title", description: "toolkit.portTool.desc", icon: Network, category: "network", component: PortTool });
  registerTool({ id: "image", name: "toolkit.imageTool.title", description: "toolkit.imageTool.desc", icon: ImageIcon, category: "network", component: ImageTool });
  registerTool({ id: "env-viewer", name: "toolkit.envViewerTool.title", description: "toolkit.envViewerTool.desc", icon: Terminal, category: "network", component: EnvViewerTool });
}
