import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from './bo-cung-cap/AppContext';
import AppRoutes from './tuyen-duong/AppRoutes';

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  );
}

