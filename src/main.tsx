import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './styles/global.css';
import {installImageFallback} from './utils/imageFallback';

installImageFallback();

createRoot(document.getElementById('root')!).render(<App />);
