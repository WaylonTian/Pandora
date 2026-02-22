export interface PluginFeature {
  code: string;
  explain?: string;
  icon?: string;
  cmds: any[];
}

export interface PluginManifest {
  main?: string;
  logo?: string;
  preload?: string;
  features: PluginFeature[];
  pluginSetting?: any;
}

export interface InstalledPlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  logo?: string;
  path: string;
  manifest: PluginManifest;
  enabled: boolean;
  installed_at: string;
}

export interface MarketPlugin {
  name: string;
  description: string;
  logo: string;
  plugin_id: string;
}

export interface MarketPluginDetail {
  name: string;
  description: string;
  version: string;
  size: string;
  download_url?: string;
  developer: string;
  rating: string;
  users: string;
  detail_html: string;
}
