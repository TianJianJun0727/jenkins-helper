/**
 * Jenkins configuration types
 */

export interface JenkinsConfig {
  url: string;
  username: string;
  token: string;
  webhook?: string;
  defaultEnv?: string; // 默认构建环境
}

export interface JenkinsAuth {
  username: string;
  password: string;
}

export const DEFAULT_CONFIG: JenkinsConfig = {
  url: '',
  username: '',
  token: '',
  webhook: '',
  defaultEnv: '',
};
