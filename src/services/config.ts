/**
 * Configuration management module
 * Handles loading, saving, and validating Jenkins configuration
 */

import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { JenkinsConfig, JenkinsAuth, DEFAULT_CONFIG } from '../types/config';
import { CONFIG } from '../constants';

/**
 * Current configuration instance (in-memory cache)
 */
let currentConfig: JenkinsConfig = { ...DEFAULT_CONFIG };

/**
 * Get current configuration (returns a copy to prevent external modification)
 */
export function getCurrentConfig(): JenkinsConfig {
  return { ...currentConfig };
}

/**
 * Set current configuration
 */
export function setCurrentConfig(cfg: Partial<JenkinsConfig>): void {
  currentConfig = { ...DEFAULT_CONFIG, ...cfg };
}

/**
 * Get authentication credentials for Jenkins API
 */
export function getAuth(): JenkinsAuth {
  return {
    username: currentConfig.username,
    password: currentConfig.token,
  };
}

/**
 * Get configuration directory URI
 */
function getConfigDirUri(): vscode.Uri {
  const homeDir = os.homedir();
  return vscode.Uri.file(path.join(homeDir, CONFIG.DIR_NAME));
}

/**
 * Get configuration file URI
 */
function getConfigFileUri(): vscode.Uri {
  return vscode.Uri.joinPath(getConfigDirUri(), CONFIG.FILE_NAME);
}

/**
 * Validate Jenkins configuration
 */
export function isValidJenkinsConfig(obj: unknown): obj is JenkinsConfig {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  const cfg = obj as Record<string, unknown>;
  return (
    typeof cfg.url === 'string' &&
    cfg.url.trim() !== '' &&
    typeof cfg.username === 'string' &&
    cfg.username.trim() !== '' &&
    typeof cfg.token === 'string' &&
    cfg.token.trim() !== '' &&
    (cfg.webhook === undefined || typeof cfg.webhook === 'string')
  );
}

/**
 * Load configuration from disk
 */
export async function loadConfig(): Promise<JenkinsConfig> {
  const configUri = getConfigFileUri();

  try {
    // Check if config file exists
    await vscode.workspace.fs.stat(configUri);
  } catch {
    // File doesn't exist, use default config
    currentConfig = { ...DEFAULT_CONFIG };
    return currentConfig;
  }

  try {
    const data = await vscode.workspace.fs.readFile(configUri);
    const text = new TextDecoder('utf-8').decode(data);
    const parsed = JSON.parse(text);

    if (!isValidJenkinsConfig(parsed)) {
      console.error('配置文件内容无效,使用默认配置');
      currentConfig = { ...DEFAULT_CONFIG };
      return currentConfig;
    }

    // Merge default values with user config
    currentConfig = { ...DEFAULT_CONFIG, ...parsed };
    return currentConfig;
  } catch (error) {
    console.error('解析或加载配置文件失败:', error);
    currentConfig = { ...DEFAULT_CONFIG };
    return currentConfig;
  }
}

/**
 * Save configuration to disk
 */
export async function saveConfig(config: JenkinsConfig): Promise<void> {
  const dirUri = getConfigDirUri();
  const fileUri = getConfigFileUri();

  try {
    // Ensure directory exists
    try {
      await vscode.workspace.fs.stat(dirUri);
    } catch {
      await vscode.workspace.fs.createDirectory(dirUri);
    }

    // Validate config before saving
    if (!isValidJenkinsConfig(config)) {
      throw new Error('配置内容无效,请检查配置信息');
    }

    currentConfig = { ...config };
    const content = JSON.stringify(currentConfig, null, 2);
    const encoder = new TextEncoder();
    await vscode.workspace.fs.writeFile(fileUri, encoder.encode(content));
  } catch (error) {
    console.error('保存配置文件失败:', error);
    throw error;
  }
}

/**
 * Clear configuration (reset to default)
 */
export async function clearConfig(): Promise<void> {
  await saveConfig({ ...DEFAULT_CONFIG });
}
