/**
 * VSCode Webview API Integration
 * Provides typed interface for communicating with VSCode extension
 */

/**
 * VSCode API interface
 */
interface VSCodeApi<T = unknown> {
  postMessage(message: T): void;
  getState(): T;
  setState(state: T): void;
}

declare global {
  interface Window {
    acquireVsCodeApi?: () => VSCodeApi;
  }
}

/**
 * VSCode API instance (singleton)
 */
let vscodeApi: VSCodeApi | null = null;

/**
 * Get VSCode API instance
 * Returns mock API in development mode
 */
export function getVSCodeAPI(): VSCodeApi | null {
  if (vscodeApi) {
    return vscodeApi;
  }

  if (typeof window !== 'undefined' && window.acquireVsCodeApi) {
    vscodeApi = window.acquireVsCodeApi();
    return vscodeApi;
  }

  // Development mode: return mock API
  console.warn('VSCode API 不可用,使用模拟模式');
  return {
    postMessage: (message: unknown) => {
      console.log('[Mock] postMessage:', message);
    },
    getState: () => ({}),
    setState: (state: unknown) => {
      console.log('[Mock] setState:', state);
    },
  };
}

/**
 * Send message to extension
 */
export function postMessage<T = unknown>(message: T): void {
  const api = getVSCodeAPI();
  api?.postMessage(message);
}

/**
 * Listen for messages from extension
 * @param handler Message handler function
 * @returns Cleanup function to remove listener
 */
export function onMessage<T = unknown>(handler: (message: T) => void): () => void {
  const listener = (event: MessageEvent<T>) => {
    handler(event.data);
  };
  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}

/**
 * Notify extension that webview is ready
 */
export function notifyReady(): void {
  postMessage({ type: 'ready' });
}

/**
 * Save state to VSCode
 */
export function saveState(state: unknown): void {
  const api = getVSCodeAPI();
  api?.setState(state);
}

/**
 * Restore state from VSCode
 */
export function restoreState(): unknown {
  const api = getVSCodeAPI();
  return api?.getState() || {};
}
