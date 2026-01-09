/**
 * Jenkins Helper Extension Entry Point
 * Main extension file that handles activation and command registration
 */

import * as path from 'path';
import * as vscode from 'vscode';
import {
  loadConfig,
  saveConfig,
  getCurrentConfig,
  setCurrentConfig,
  isValidJenkinsConfig,
  getBranchInfo,
  getEnvOptions,
  getLastBuildResult,
  triggerBuildWithLifecycle,
  sendWebhook,
} from './services';
import { createPanel, PanelSession } from './webview/panel';
import {
  MessageType,
  TriggerBuildPayload,
  WebviewMessage,
  JenkinsConfig,
  BuildResult,
  JenkinsBlueOceanNode,
} from './types';
import { DEFAULT_CONFIG } from './types/config';
import { COMMANDS, ERROR_MESSAGES, SUCCESS_MESSAGES } from './constants';

/**
 * Current panel instance (singleton)
 */
let currentPanel: PanelSession | undefined;

/**
 * Get workspace root directory
 * Prioritizes active editor's workspace, falls back to first workspace
 */
function getWorkspaceRoot(): string | undefined {
  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(
      activeEditor.document.uri
    );
    if (workspaceFolder) {
      return workspaceFolder.uri.fsPath;
    }
  }
  const firstWorkspace = vscode.workspace.workspaceFolders?.[0];
  return firstWorkspace?.uri.fsPath;
}

/**
 * Send build data (branches and environments) to webview
 */
async function sendBuildData(
  panel: PanelSession,
  workspaceRoot: string,
  projectName: string
): Promise<void> {
  const cfg = getCurrentConfig();

  try {
    const [branchInfo, envOptions] = await Promise.all([
      getBranchInfo(workspaceRoot),
      getEnvOptions(projectName, cfg.url),
    ]);

    panel.postMessage({
      type: MessageType.UPDATE_DATA,
      currentBranch: branchInfo.currentBranch,
      branchOptions: branchInfo.branchOptions,
      envOptions: envOptions ?? [],
      defaultEnv: cfg.defaultEnv,
    });
  } catch (error) {
    console.error('加载数据失败:', error);
    panel.postMessage({
      type: MessageType.LOAD_ERROR,
      message: `${ERROR_MESSAGES.LOAD_DATA_FAILED}: ${String(error)}`,
    });
  }
}

/**
 * Handle build trigger request from webview
 */
async function handleTriggerBuild(
  panel: PanelSession,
  payload: TriggerBuildPayload,
  projectName: string
): Promise<void> {


  const cfg = getCurrentConfig();

  // Send progress updates to webview
  const postProgress = (nodes: JenkinsBlueOceanNode[]) => {

    panel.postMessage({
      type: MessageType.BUILD_PROGRESS,
      nodes,
    });
  };

  // Send result updates to webview
  const postResult = (result: BuildResult) => {

    panel.postMessage({
      type: MessageType.BUILD_RESULT,
      ...result,
    });
  };

  try {
    await triggerBuildWithLifecycle(payload, postProgress, async (result) => {

      postResult(result);

      if (result.stage === 'finished') {
        // Show notification
        if (result.success) {
          vscode.window.showInformationMessage(
            result.message || SUCCESS_MESSAGES.BUILD_SUCCESS
          );
        } else {
          vscode.window.showErrorMessage(
            result.message || ERROR_MESSAGES.TRIGGER_BUILD_FAILED
          );
        }

        // Send webhook if configured
        if (cfg.webhook) {
          sendWebhook(cfg.webhook, {...result,...payload,projectName});
        }

        // Refresh last build info after build completes
        const lastBuildResult = await getLastBuildResult(payload.jobUrl);
        panel.postMessage({
          type: MessageType.LAST_BUILD_RESULT,
          result: lastBuildResult,
        });
      }
    });
  } catch (error) {
    console.error('构建失败:', error);
    const msg = `${ERROR_MESSAGES.TRIGGER_BUILD_FAILED}: ${String(error)}`;
    postResult({ stage: 'finished', success: false, message: msg,...payload,projectName });
    vscode.window.showErrorMessage(msg);
  }
}

/**
 * Handle messages from webview
 */
async function handleWebviewMessage(
  message: WebviewMessage,
  panel: PanelSession,
  workspaceRoot: string,
  projectName: string
): Promise<void> {
  const { type } = message;

  switch (type) {
    case MessageType.TRIGGER:
      if ('payload' in message) {
        await handleTriggerBuild(panel, message.payload, projectName);
      }
      break;

    case MessageType.SAVE_CONFIG:
      if ('config' in message) {
        const newConfig = message.config as JenkinsConfig;
        if (!isValidJenkinsConfig(newConfig)) {
          vscode.window.showErrorMessage(ERROR_MESSAGES.CONFIG_INCOMPLETE);
          return;
        }
        try {
          await saveConfig(newConfig);
          setCurrentConfig(newConfig);
          panel.postMessage({
            type: MessageType.CONFIG_SAVED,
            success: true,
            message: '配置已保存',
          });
          vscode.window.showInformationMessage(SUCCESS_MESSAGES.CONFIG_SAVED);
        } catch (error) {
          console.error('保存配置失败:', error);
          panel.postMessage({
            type: MessageType.CONFIG_SAVED,
            success: false,
            message: '保存配置失败',
          });
          vscode.window.showErrorMessage(ERROR_MESSAGES.SAVE_CONFIG_FAILED);
        }
      }
      break;

    case MessageType.CLEAR_CONFIG:
      try {
        await saveConfig({ ...DEFAULT_CONFIG });
        setCurrentConfig({ ...DEFAULT_CONFIG });
        panel.postMessage({
          type: MessageType.CONFIG_CLEARED,
          success: true,
          message: '配置已清除',
        });
        vscode.window.showInformationMessage(SUCCESS_MESSAGES.CONFIG_CLEARED);
      } catch (error) {
        console.error('清除配置失败:', error);
        panel.postMessage({
          type: MessageType.CONFIG_CLEARED,
          success: false,
          message: '清除配置失败',
        });
        vscode.window.showErrorMessage(ERROR_MESSAGES.CLEAR_CONFIG_FAILED);
      }
      break;

    case MessageType.LOAD_BUILD_DATA:
      await sendBuildData(panel, workspaceRoot, projectName);
      break;

    case MessageType.GET_CONFIG:
      panel.postMessage({
        type: MessageType.CONFIG_DATA,
        config: getCurrentConfig(),
      });
      break;

    case MessageType.GET_LAST_BUILD_RESULT:
      if ('payload' in message && message.payload.jobUrl) {
        const result = await getLastBuildResult(message.payload.jobUrl);
        panel.postMessage({
          type: MessageType.LAST_BUILD_RESULT,
          result,
        });
      }
      break;

    case MessageType.LOG:
      console.log('webview log:', message);
      break;

    default:
      console.warn('Unknown message type:', type);
  }
}

/**
 * Activate extension
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // Load configuration on activation
  await loadConfig();

  // Register command: Open Jenkins Helper Panel
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.OPEN_PANEL, async () => {
      const workspaceRoot = getWorkspaceRoot();
      if (!workspaceRoot) {
        vscode.window.showErrorMessage(ERROR_MESSAGES.NO_WORKSPACE);
        return;
      }

      const projectName = path.basename(workspaceRoot);
      const cfg = getCurrentConfig();
      const shouldOpenConfigFirst = !isValidJenkinsConfig(cfg);

      // If panel already exists, reveal it
      if (currentPanel) {
        currentPanel.panel.reveal(vscode.ViewColumn.Active);
        if (shouldOpenConfigFirst) {
          currentPanel.postMessage({ type: MessageType.SWITCH_TO_CONFIG });
        }
        return;
      }

      // Create new panel
      const panelSession = createPanel(context, {
        projectName,
        branches: [],
        envOptions: [],
        currentBranch: undefined,
        activePage: shouldOpenConfigFirst ? 'config' : 'build',
      });

      currentPanel = panelSession;

      // Clean up when panel is disposed
      panelSession.panel.onDidDispose(() => {
        currentPanel = undefined;
      });

      // Handle messages from webview
      panelSession.onMessage(async (message: WebviewMessage) => {
        await handleWebviewMessage(
          message,
          panelSession,
          workspaceRoot,
          projectName
        );
      });
    })
  );
}

/**
 * Deactivate extension
 */
export function deactivate(): void {
  // Cleanup if needed
}
