/**
 * Webview Panel Management
 * Handles creation and lifecycle of the webview panel
 */

import * as vscode from 'vscode';
import { readFileSync } from 'node:fs';
import { WEBVIEW } from '../constants';

/**
 * Message handler type
 */
type MessageHandler = (message: any) => void;

/**
 * Panel session interface
 */
export interface PanelSession {
  panel: vscode.WebviewPanel;
  postMessage: (msg: any) => void;
  onMessage: (handler: MessageHandler) => vscode.Disposable;
  ready: Promise<void>;
  dispose: () => void;
}

/**
 * Generate webview HTML content
 * Loads built webview assets and injects proper URIs
 */
export function getWebviewContent(
  webview: vscode.Webview,
  extensionUri: vscode.Uri
): string {
  const distPath = vscode.Uri.joinPath(extensionUri, 'webview-ui', 'dist');
  const htmlUri = vscode.Uri.joinPath(distPath, 'index.html');

  // Read built HTML file
  let html = readFileSync(htmlUri.fsPath, 'utf8');

  // Replace CSS file references with webview URIs
  html = html.replace(/href="\/([^"]+\.css)"/g, (_, p1) => {
    const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(distPath, p1));
    return `href="${cssUri.toString()}"`;
  });

  // Replace JS file references with webview URIs
  html = html.replace(/src="\/([^"]+\.js)"/g, (_, p1) => {
    const jsUri = webview.asWebviewUri(vscode.Uri.joinPath(distPath, p1));
    return `src="${jsUri.toString()}"`;
  });

  // Replace favicon references with webview URIs
  html = html.replace(/href="\/([^"]+\.png)"/g, (_, p1) => {
    const iconUri = webview.asWebviewUri(vscode.Uri.joinPath(distPath, p1));
    return `href="${iconUri.toString()}"`;
  });

  // Add Content Security Policy
  const cspContent = `default-src 'none'; img-src ${webview.cspSource} https:; script-src ${webview.cspSource} 'unsafe-inline'; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource};`;

  html = html.replace(
    '<head>',
    `<head>\n    <meta http-equiv="Content-Security-Policy" content="${cspContent}">`
  );

  return html;
}

/**
 * Create webview panel session
 */
export function createPanel(
  context: vscode.ExtensionContext,
  initialData?: any
): PanelSession {
  // Create webview panel
  const panel = vscode.window.createWebviewPanel(
    WEBVIEW.VIEW_TYPE,
    WEBVIEW.TITLE,
    vscode.ViewColumn.Active,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [
        vscode.Uri.joinPath(context.extensionUri, 'webview-ui', 'dist'),
      ],
    }
  );

  // Set HTML content
  panel.webview.html = getWebviewContent(panel.webview, context.extensionUri);

  // Message queue management
  let isReady = false;
  const pendingMessages: any[] = [];
  let readyResolve: () => void = () => {};
  const ready = new Promise<void>((resolve) => {
    readyResolve = resolve;
  });

  // Add initial data to pending messages
  if (initialData) {
    pendingMessages.push({ type: 'init-data', ...initialData });
  }

  /**
   * Post message to webview
   * Queues messages until webview is ready
   */
  const postMessage = (msg: any) => {
    if (isReady) {
      panel.webview.postMessage(msg);
    } else {
      pendingMessages.push(msg);
    }
  };

  /**
   * Flush pending messages
   */
  const flush = () => {
    if (!isReady || pendingMessages.length === 0) {
      return;
    }
    pendingMessages.splice(0).forEach((m) => panel.webview.postMessage(m));
  };

  // Message handlers
  const handlers = new Set<MessageHandler>();
  const disposable = panel.webview.onDidReceiveMessage((message) => {
    // Handle ready message
    if (message?.type === 'ready') {
      isReady = true;
      readyResolve();
      flush();
      return;
    }
    // Forward to registered handlers
    handlers.forEach((h) => h(message));
  });

  return {
    panel,
    postMessage,
    onMessage: (handler: MessageHandler) => {
      handlers.add(handler);
      return new vscode.Disposable(() => handlers.delete(handler));
    },
    ready,
    dispose: () => {
      disposable.dispose();
      panel.dispose();
    },
  };
}
