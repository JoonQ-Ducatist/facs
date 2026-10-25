/** 정의: React StrictMode와 BrowserRouter를 연결해 FACt.Smack SPA를 DOM에 마운트하는 진입점이다. */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles/global.css';
import { initializePwa } from './services/pwaInstall.js';

initializePwa();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
