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
import { UnicodeTool } from "./tools/unicode-tool";
import { HtmlCodecTool } from "./tools/html-codec-tool";
import { HexStringTool } from "./tools/hex-string-tool";
import { AsciiTool } from "./tools/ascii-tool";
import { EncryptTool } from "./tools/encrypt-tool";
import { BcryptTool } from "./tools/bcrypt-tool";
import { TextProcessTool } from "./tools/text-process-tool";
import { DiffTool } from "./tools/diff-tool";
import { NamingTool } from "./tools/naming-tool";
import { JsonYamlTool } from "./tools/json-yaml-tool";
import { MarkdownPreviewTool } from "./tools/markdown-preview-tool";
import { CsvTableTool } from "./tools/csv-table-tool";
import { LoremTool } from "./tools/lorem-tool";
import { SqlFormatTool } from "./tools/sql-format-tool";
import { LineCountTool } from "./tools/line-count-tool";
import { ChineseConvertTool } from "./tools/chinese-convert-tool";
import { RandomStringTool } from "./tools/random-string-tool";
import { QrcodeTool } from "./tools/qrcode-tool";
import { CronTool } from "./tools/cron-tool";
import { PortTool } from "./tools/port-tool";
import { ColorPickerTool } from "./tools/color-picker-tool";
import { ImageTool } from "./tools/image-tool";
import { FileHashTool } from "./tools/file-hash-tool";
import { EnvViewerTool } from "./tools/env-viewer-tool";
import {
  Braces, Clock, Regex, FileCode2, Link, Binary, Fingerprint, Palette, Hash, KeyRound, Globe, FileEdit,
  Type, Code, Hexagon, Table2, Lock, ShieldCheck, CaseSensitive, GitCompare, ArrowLeftRight,
  Shuffle, QrCode, Timer, Network, Pipette, ImageIcon, FileCheck, Terminal,
  FileJson, Eye, TableProperties, TextCursorInput, Database, Calculator, Languages,
} from "lucide-react";

export function registerAllTools() {
  // Encoding
  registerTool({ id: "base64", name: "toolkit.base64Tool.title", description: "toolkit.base64Tool.desc", icon: FileCode2, category: "encoding", component: Base64Tool });
  registerTool({ id: "url-codec", name: "toolkit.urlCodecTool.title", description: "toolkit.urlCodecTool.desc", icon: Link, category: "encoding", component: UrlCodecTool });
  registerTool({ id: "unicode", name: "toolkit.unicodeTool.title", description: "toolkit.unicodeTool.desc", icon: Type, category: "encoding", component: UnicodeTool });
  registerTool({ id: "html-codec", name: "toolkit.htmlCodecTool.title", description: "toolkit.htmlCodecTool.desc", icon: Code, category: "encoding", component: HtmlCodecTool });
  registerTool({ id: "hex-string", name: "toolkit.hexStringTool.title", description: "toolkit.hexStringTool.desc", icon: Hexagon, category: "encoding", component: HexStringTool });
  registerTool({ id: "ascii", name: "toolkit.asciiTool.title", description: "toolkit.asciiTool.desc", icon: Table2, category: "encoding", component: AsciiTool });
  // Crypto
  registerTool({ id: "crypto", name: "toolkit.cryptoTool.title", description: "toolkit.cryptoTool.desc", icon: Hash, category: "crypto", component: CryptoTool });
  registerTool({ id: "encrypt", name: "toolkit.encryptTool.title", description: "toolkit.encryptTool.desc", icon: Lock, category: "crypto", component: EncryptTool });
  registerTool({ id: "bcrypt", name: "toolkit.bcryptTool.title", description: "toolkit.bcryptTool.desc", icon: ShieldCheck, category: "crypto", component: BcryptTool });
  registerTool({ id: "jwt", name: "toolkit.jwtTool.title", description: "toolkit.jwtTool.desc", icon: KeyRound, category: "crypto", component: JwtTool });
  // Text
  registerTool({ id: "json", name: "toolkit.jsonTool.title", description: "toolkit.jsonTool.desc", icon: Braces, category: "text", component: JsonTool });
  registerTool({ id: "text-process", name: "toolkit.textProcessTool.title", description: "toolkit.textProcessTool.desc", icon: CaseSensitive, category: "text", component: TextProcessTool });
  registerTool({ id: "diff", name: "toolkit.diffTool.title", description: "toolkit.diffTool.desc", icon: GitCompare, category: "text", component: DiffTool });
  registerTool({ id: "regex", name: "toolkit.regexTool.title", description: "toolkit.regexTool.desc", icon: Regex, category: "text", component: RegexTool });
  registerTool({ id: "naming", name: "toolkit.namingTool.title", description: "toolkit.namingTool.desc", icon: ArrowLeftRight, category: "text", component: NamingTool });
  registerTool({ id: "json-yaml", name: "toolkit.jsonYamlTool.title", description: "toolkit.jsonYamlTool.desc", icon: FileJson, category: "text", component: JsonYamlTool });
  registerTool({ id: "markdown-preview", name: "toolkit.markdownPreviewTool.title", description: "toolkit.markdownPreviewTool.desc", icon: Eye, category: "text", component: MarkdownPreviewTool });
  registerTool({ id: "csv-table", name: "toolkit.csvTableTool.title", description: "toolkit.csvTableTool.desc", icon: TableProperties, category: "text", component: CsvTableTool });
  registerTool({ id: "sql-format", name: "toolkit.sqlFormatTool.title", description: "toolkit.sqlFormatTool.desc", icon: Database, category: "text", component: SqlFormatTool });
  registerTool({ id: "line-count", name: "toolkit.lineCountTool.title", description: "toolkit.lineCountTool.desc", icon: Calculator, category: "text", component: LineCountTool });
  registerTool({ id: "chinese-convert", name: "toolkit.chineseConvertTool.title", description: "toolkit.chineseConvertTool.desc", icon: Languages, category: "text", component: ChineseConvertTool });
  // Generator
  registerTool({ id: "uuid", name: "toolkit.uuidTool.title", description: "toolkit.uuidTool.desc", icon: Fingerprint, category: "generator", component: UuidTool });
  registerTool({ id: "random-string", name: "toolkit.randomStringTool.title", description: "toolkit.randomStringTool.desc", icon: Shuffle, category: "generator", component: RandomStringTool });
  registerTool({ id: "qrcode", name: "toolkit.qrcodeTool.title", description: "toolkit.qrcodeTool.desc", icon: QrCode, category: "generator", component: QrcodeTool });
  registerTool({ id: "color", name: "toolkit.colorTool.title", description: "toolkit.colorTool.desc", icon: Palette, category: "generator", component: ColorTool });
  registerTool({ id: "lorem", name: "toolkit.loremTool.title", description: "toolkit.loremTool.desc", icon: TextCursorInput, category: "generator", component: LoremTool });
  // Datetime
  registerTool({ id: "timestamp", name: "toolkit.timestampTool.title", description: "toolkit.timestampTool.desc", icon: Clock, category: "datetime", component: TimestampTool });
  registerTool({ id: "cron", name: "toolkit.cronTool.title", description: "toolkit.cronTool.desc", icon: Timer, category: "datetime", component: CronTool });
  // Number
  registerTool({ id: "base-converter", name: "toolkit.baseConverterTool.title", description: "toolkit.baseConverterTool.desc", icon: Binary, category: "number", component: BaseConverterTool });
  // Network
  registerTool({ id: "ip-info", name: "toolkit.ipInfoTool.title", description: "toolkit.ipInfoTool.desc", icon: Globe, category: "network", component: IpInfoTool });
  registerTool({ id: "hosts", name: "toolkit.hostsEditorTool.title", description: "toolkit.hostsEditorTool.desc", icon: FileEdit, category: "network", component: HostsEditorTool });
  registerTool({ id: "port", name: "toolkit.portTool.title", description: "toolkit.portTool.desc", icon: Network, category: "network", component: PortTool });
  // System
  registerTool({ id: "color-picker", name: "toolkit.colorPickerTool.title", description: "toolkit.colorPickerTool.desc", icon: Pipette, category: "system", component: ColorPickerTool });
  registerTool({ id: "image", name: "toolkit.imageTool.title", description: "toolkit.imageTool.desc", icon: ImageIcon, category: "system", component: ImageTool });
  registerTool({ id: "file-hash", name: "toolkit.fileHashTool.title", description: "toolkit.fileHashTool.desc", icon: FileCheck, category: "system", component: FileHashTool });
  registerTool({ id: "env-viewer", name: "toolkit.envViewerTool.title", description: "toolkit.envViewerTool.desc", icon: Terminal, category: "system", component: EnvViewerTool });
}
