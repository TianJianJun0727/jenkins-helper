import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { notifyReady } from './utils/vscode';
import 'antd/dist/reset.css';

const rootEl = document.getElementById('root');
if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );

  // 通知扩展 webview 已准备好
  notifyReady();
}
