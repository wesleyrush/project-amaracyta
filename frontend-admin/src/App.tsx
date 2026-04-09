import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login          from './pages/Login';
import Home           from './pages/Home';
import ModuleList        from './pages/modules/ModuleList';
import ModuleForm        from './pages/modules/ModuleForm';
import ModulePackageList from './pages/modules/ModulePackageList';
import ModulePackageForm from './pages/modules/ModulePackageForm';
import ModuleLevelList   from './pages/modules/ModuleLevelList';
import ModuleLevelForm   from './pages/modules/ModuleLevelForm';
import ClientList     from './pages/clients/ClientList';
import AdminUserList  from './pages/adminUsers/AdminUserList';
import AdminUserForm  from './pages/adminUsers/AdminUserForm';
import ChestList              from './pages/cobranca/ChestList';
import ChestForm              from './pages/cobranca/ChestForm';
import CoinProportionSettings from './pages/cobranca/CoinProportionSettings';
import CoinOrderList          from './pages/cobranca/CoinOrderList';
import ModuleOrderList        from './pages/cobranca/ModuleOrderList';
import SiteSettingsPage       from './pages/SiteSettingsPage';
import './styles/admin.css';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />

          <Route path="/modulos" element={<ProtectedRoute><ModuleList /></ProtectedRoute>} />
          <Route path="/modulos/novo" element={<ProtectedRoute><ModuleForm /></ProtectedRoute>} />
          <Route path="/modulos/:id/editar" element={<ProtectedRoute><ModuleForm /></ProtectedRoute>} />
          <Route path="/modulos/pacotes" element={<ProtectedRoute><ModulePackageList /></ProtectedRoute>} />
          <Route path="/modulos/pacotes/novo" element={<ProtectedRoute><ModulePackageForm /></ProtectedRoute>} />
          <Route path="/modulos/pacotes/:id/editar" element={<ProtectedRoute><ModulePackageForm /></ProtectedRoute>} />
          <Route path="/modulos/niveis" element={<ProtectedRoute><ModuleLevelList /></ProtectedRoute>} />
          <Route path="/modulos/niveis/novo" element={<ProtectedRoute><ModuleLevelForm /></ProtectedRoute>} />
          <Route path="/modulos/niveis/:id/editar" element={<ProtectedRoute><ModuleLevelForm /></ProtectedRoute>} />

          <Route path="/clientes" element={<ProtectedRoute><ClientList /></ProtectedRoute>} />

          <Route path="/usuarios" element={<ProtectedRoute><AdminUserList /></ProtectedRoute>} />
          <Route path="/usuarios/novo" element={<ProtectedRoute><AdminUserForm /></ProtectedRoute>} />
          <Route path="/usuarios/:id/editar" element={<ProtectedRoute><AdminUserForm /></ProtectedRoute>} />

          <Route path="/cobranca/baus" element={<ProtectedRoute><ChestList /></ProtectedRoute>} />
          <Route path="/cobranca/baus/novo" element={<ProtectedRoute><ChestForm /></ProtectedRoute>} />
          <Route path="/cobranca/baus/:id/editar" element={<ProtectedRoute><ChestForm /></ProtectedRoute>} />
          <Route path="/cobranca/pedidos" element={<ProtectedRoute><CoinOrderList /></ProtectedRoute>} />
          <Route path="/cobranca/pedidos-modulos" element={<ProtectedRoute><ModuleOrderList /></ProtectedRoute>} />
          <Route path="/cobranca/proporcoes" element={<ProtectedRoute><CoinProportionSettings /></ProtectedRoute>} />

          <Route path="/configuracoes" element={<ProtectedRoute><SiteSettingsPage /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
