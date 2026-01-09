/**
 * Constants used throughout the extension
 */

/**
 * Extension command identifiers
 */
export const COMMANDS = {
  OPEN_PANEL: 'jenkins-helper.openPanel',
} as const;

/**
 * Webview identifiers
 */
export const WEBVIEW = {
  VIEW_TYPE: 'jenkinsHelper',
  TITLE: 'Jenkins 构建助手',
} as const;

/**
 * Jenkins API endpoints
 */
export const JENKINS_API = {
  JOBS_TREE: 'api/json?tree=jobs[name,url,jobs[name,url,jobs[name,url]]]',
  BUILD_WITH_PARAMS: 'buildWithParameters',
  QUEUE_API: 'api/json',
  BUILD_API: 'api/json',
  LAST_BUILD: 'lastBuild/api/json',
  BLUE_OCEAN_BASE: 'blue/rest/organizations/jenkins/pipelines',
} as const;

/**
 * Polling configuration
 */
export const POLLING = {
  QUEUE_MAX_ATTEMPTS: 30,
  QUEUE_INTERVAL: 2000, // 2 seconds
  BUILD_MAX_ATTEMPTS: 600, // 30 minutes max
  BUILD_INTERVAL: 2000, // 2 seconds
} as const;

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  NO_WORKSPACE: '请先打开一个工作区或文件夹',
  CONFIG_INCOMPLETE: '配置信息不完整,请填写所有字段',
  SAVE_CONFIG_FAILED: '保存配置失败',
  CLEAR_CONFIG_FAILED: '清除配置失败',
  TRIGGER_BUILD_FAILED: '触发构建失败',
  LOAD_DATA_FAILED: '加载数据失败',
} as const;

/**
 * Success messages
 */
export const SUCCESS_MESSAGES = {
  CONFIG_SAVED: 'Jenkins配置已保存',
  CONFIG_CLEARED: 'Jenkins配置已清除',
  BUILD_SUCCESS: '构建成功',
} as const;

/**
 * Configuration file paths
 */
export const CONFIG = {
  DIR_NAME: '.jenkins-helper',
  FILE_NAME: 'config.json',
} as const;
