/**
 * Shared types for webview
 * These types are shared between extension and webview for communication
 */

/**
 * Message type constants
 */
export enum MessageType {
  // Lifecycle messages
  READY = 'ready',
  LOG = 'log',

  // Initialization and navigation
  INIT_DATA = 'init-data',
  SWITCH_TO_CONFIG = 'switch-to-config',

  // Configuration messages
  GET_CONFIG = 'get-config',
  CONFIG_DATA = 'config-data',
  SAVE_CONFIG = 'save-config',
  CONFIG_SAVED = 'config-saved',
  CLEAR_CONFIG = 'clear-config',
  CONFIG_CLEARED = 'config-cleared',

  // Build data messages
  LOAD_BUILD_DATA = 'load-build-data',
  UPDATE_DATA = 'update-data',
  LOAD_ERROR = 'load-error',

  // Build trigger messages
  TRIGGER = 'trigger',
  BUILD_PROGRESS = 'build-progress',
  BUILD_RESULT = 'build-result',

  // Last build result
  GET_LAST_BUILD_RESULT = 'get-last-build-result',
  LAST_BUILD_RESULT = 'last-build-result',
}

/**
 * Labeled value for select options
 */
export interface LabeledValue {
  label: string;
  value: string;
}

/**
 * Jenkins configuration
 */
export interface JenkinsConfig {
  url: string;
  username: string;
  token: string;
  webhook?: string;
  defaultEnv?: string; // 默认构建环境
}

/**
 * Build trigger payload
 */
export interface TriggerBuildPayload {
  env: string;
  jobUrl: string;
  branch: string;
  branchLabel: string;
}

/**
 * Blue Ocean Pipeline Node (Stage)
 */
export interface JenkinsBlueOceanNode {
  displayName: string;
  durationInMillis?: number;
  startTime?: string | null;
  result:
    | 'SUCCESS'
    | 'FAILURE'
    | 'UNSTABLE'
    | 'UNKNOWN'
    | 'ABORTED'
    | 'NOT_BUILT'
    | null;
  state: 'RUNNING' | 'FINISHED' | 'PAUSED' | 'QUEUED' | 'NOT_EXECUTED' | null;
}

/**
 * Build result data
 */
export interface BuildResultData {
  stage: 'queued' | 'building' | 'finished';
  success?: boolean;
  message?: string;
  buildNumber?: number;
  buildUrl?: string;
  result?: string;
  projectName?: string;
  builder?: string;
  env?: string;
  branch?: string;
  duration?: number; // 构建总耗时（毫秒）
}

/**
 * Last build result
 */
export interface LastBuildResult {
  builder: string | null;
  branch: string | null;
  timestamp?: number;
  buildNumber?: number; // 构建编号
  buildUrl?: string; // 构建链接
  result?: string; // 构建结果 SUCCESS/FAILURE/UNSTABLE 等
}

// ============ Extension -> Webview Messages ============

/**
 * Common message base structure
 */
export interface BaseMessage {
  type: MessageType | string;
}

/**
 * Initial data sent to webview on creation
 */
export interface InitDataMessage extends BaseMessage {
  type: MessageType.INIT_DATA;
  projectName: string;
  branches: LabeledValue[];
  envOptions: LabeledValue[];
  currentBranch?: string;
  activePage: 'build' | 'config';
}

/**
 * Switch to config page
 */
export interface SwitchToConfigMessage extends BaseMessage {
  type: MessageType.SWITCH_TO_CONFIG;
}

/**
 * Configuration data response
 */
export interface ConfigDataMessage extends BaseMessage {
  type: MessageType.CONFIG_DATA;
  config: JenkinsConfig;
}

/**
 * Configuration saved response
 */
export interface ConfigSavedMessage extends BaseMessage {
  type: MessageType.CONFIG_SAVED;
  success: boolean;
  message: string;
}

/**
 * Configuration cleared response
 */
export interface ConfigClearedMessage extends BaseMessage {
  type: MessageType.CONFIG_CLEARED;
  success: boolean;
  message: string;
}

/**
 * Build data update
 */
export interface UpdateDataMessage extends BaseMessage {
  type: MessageType.UPDATE_DATA;
  currentBranch?: string;
  branchOptions: LabeledValue[];
  envOptions: LabeledValue[];
  defaultEnv?: string; // 默认构建环境
}

/**
 * Load error message
 */
export interface LoadErrorMessage extends BaseMessage {
  type: MessageType.LOAD_ERROR;
  message: string;
}

/**
 * Build progress update
 */
export interface BuildProgressMessage extends BaseMessage {
  type: MessageType.BUILD_PROGRESS;
  nodes: JenkinsBlueOceanNode[];
}

/**
 * Build result message
 */
export interface BuildResultMessage extends BaseMessage, BuildResultData {
  type: MessageType.BUILD_RESULT;
}

/**
 * Last build result message
 */
export interface LastBuildResultMessage extends BaseMessage {
  type: MessageType.LAST_BUILD_RESULT;
  result: LastBuildResult;
}
