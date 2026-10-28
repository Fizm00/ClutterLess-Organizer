export interface VersionInfo {
  version: string;
  commit: string;
  buildDate: string;
}

export interface SystemApi {
  version(): Promise<VersionInfo>;
}

export interface Api {
  system: SystemApi;
  onTick(callback: (tick: number) => void): () => void;
}

