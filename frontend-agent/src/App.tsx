// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { useTheme } from './hooks/useTheme';
import ChatPage from './pages/ChatPage';
import Login from './pages/Login';
import Register from './pages/Register';
import ProfileDataPage from './pages/ProfileDataPage';
import ProfilePasswordPage from './pages/ProfilePasswordPage';
import ChildrenPage from './pages/ChildrenPage';
import StorePage from './pages/StorePage';
import HistoryPage from './pages/HistoryPage';
import CheckoutPage from './pages/CheckoutPage';
import ModuleCheckoutPage from './pages/ModuleCheckoutPage';
import PurchaseSuccessPage from './pages/PurchaseSuccessPage';
import InternalLayout from './components/InternalLayout';
import './styles.css';

function ThemeInit() {
  useTheme();
  return null;
}

function PrivateRoute({ children }: { children: JSX.Element }) {
  const { authReady, authed } = useApp();
  if (!authReady) return null;
  if (!authed) return <Navigate to="/login" replace />;
  return children;
}

export default function App(){
  return (
    <BrowserRouter>
      <AppProvider>
        <ThemeInit />
        <Routes>
          <Route path="/" element={<PrivateRoute><ChatPage/></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><InternalLayout><ProfileDataPage/></InternalLayout></PrivateRoute>} />
          <Route path="/profile/password" element={<PrivateRoute><InternalLayout><ProfilePasswordPage/></InternalLayout></PrivateRoute>} />
          <Route path="/children" element={<PrivateRoute><InternalLayout><ChildrenPage/></InternalLayout></PrivateRoute>} />
          <Route path="/store" element={<PrivateRoute><InternalLayout><StorePage/></InternalLayout></PrivateRoute>} />
          <Route path="/history" element={<PrivateRoute><InternalLayout><HistoryPage/></InternalLayout></PrivateRoute>} />
          <Route path="/checkout/:id" element={<PrivateRoute><CheckoutPage/></PrivateRoute>} />
          <Route path="/module-checkout" element={<PrivateRoute><ModuleCheckoutPage/></PrivateRoute>} />
          <Route path="/purchase-success" element={<PrivateRoute><PurchaseSuccessPage/></PrivateRoute>} />
          <Route path="/login" element={<Login/>} />
          <Route path="/register" element={<Register/>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}
