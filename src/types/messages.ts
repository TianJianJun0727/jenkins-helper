/**
 * Message types for Extension <-> Webview communication
 * This file defines all message types and payloads exchanged between the extension and webview
 */

import { JenkinsBlueOceanNode } from './jenkins';
import { JenkinsConfig } from './config';

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
 * Common message base structure
 */
export interface BaseMessage {
  type: MessageType | string;
}

/**
 * Labeled value for select options
 */
export interface LabeledValue {
  label: string;
  value: string;
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
}

/**
 * Last build result
 */
export interface LastBuildResult {
  builder: string | null;
  branch: string | null;
  timestamp?: number;
}

// ============ Extension -> Webview Messages ============

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

// ============ Webview -> Extension Messages ============

/**
 * Ready message from webview
 */
export interface ReadyMessage extends BaseMessage {
  type: MessageType.READY;
}

/**
 * Log message from webview
 */
export interface LogMessage extends BaseMessage {
  type: MessageType.LOG;
  [key: string]: any;
}

/**
 * Get configuration request
 */
export interface GetConfigMessage extends BaseMessage {
  type: MessageType.GET_CONFIG;
}

/**
 * Save configuration request
 */
export interface SaveConfigMessage extends BaseMessage {
  type: MessageType.SAVE_CONFIG;
  config: JenkinsConfig;
}

/**
 * Clear configuration request
 */
export interface ClearConfigMessage extends BaseMessage {
  type: MessageType.CLEAR_CONFIG;
}

/**
 * Load build data request
 */
export interface LoadBuildDataMessage extends BaseMessage {
  type: MessageType.LOAD_BUILD_DATA;
}

/**
 * Trigger build request
 */
export interface TriggerBuildMessage extends BaseMessage {
  type: MessageType.TRIGGER;
  payload: TriggerBuildPayload;
}

/**
 * Get last build result request
 */
export interface GetLastBuildResultMessage extends BaseMessage {
  type: MessageType.GET_LAST_BUILD_RESULT;
  payload: {
    jobUrl: string;
  };
}

// ============ Union Types ============

/**
 * All messages from Extension to Webview
 */
export type ExtensionMessage =
  | InitDataMessage
  | SwitchToConfigMessage
  | ConfigDataMessage
  | ConfigSavedMessage
  | ConfigClearedMessage
  | UpdateDataMessage
  | LoadErrorMessage
  | BuildProgressMessage
  | BuildResultMessage
  | LastBuildResultMessage;

/**
 * All messages from Webview to Extension
 */
export type WebviewMessage =
  | ReadyMessage
  | LogMessage
  | GetConfigMessage
  | SaveConfigMessage
  | ClearConfigMessage
  | LoadBuildDataMessage
  | TriggerBuildMessage
  | GetLastBuildResultMessage;

/**
 * Any message type
 */
export type AnyMessage = ExtensionMessage | WebviewMessage;
