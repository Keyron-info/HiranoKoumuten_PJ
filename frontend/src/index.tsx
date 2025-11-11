// src/index.tsx
// Reactアプリケーションのエントリーポイント（統合済み）

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// React 18 以降のルート作成
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// アプリケーションを描画
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// パフォーマンス計測用（任意）
reportWebVitals();
