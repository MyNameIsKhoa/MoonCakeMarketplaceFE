import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { BrowserRouter } from 'react-router-dom';
import './styles/global.css';
import {installImageFallback} from './utils/imageFallback';
import {AuthProvider} from './context/AuthContext';
import {CatalogProvider} from './context/CatalogContext';

installImageFallback();

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <CatalogProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </CatalogProvider>
  </AuthProvider>
);
