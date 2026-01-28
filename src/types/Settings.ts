export interface TaxonomyRule {
  label: string;
  keywords: string[];
}

export interface TaxonomyConfig {
  topics: TaxonomyRule[];
  modules: TaxonomyRule[];
  types: TaxonomyRule[];
}

export interface ExtensionSettings {
  session_gap_minutes: number;
  taxonomy: TaxonomyConfig;
}
