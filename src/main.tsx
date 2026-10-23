import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './styles/global.css';
import {installImageFallback} from './utils/imageFallback';
import {AuthProvider} from './context/AuthContext';
import {CatalogProvider} from './context/CatalogContext';

installImageFallback();

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <CatalogProvider>
      <App />
    </CatalogProvider>
  </AuthProvider>
);
