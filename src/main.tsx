
import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

const isDev = process.env.NODE_ENV === 'development';
const root = createRoot(document.getElementById('root')!);

if (isDev) {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  root.render(<App />);
}
