import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user } = useAuth();

  return (
    <Layout title="Dashboard">
      <div className="home-welcome">
        <div className="welcome-card">
          <div className="welcome-icon">✦</div>
          <h2>Bem-vindo, {user?.name}!</h2>
          <p>Utilize o menu lateral para navegar pelo painel administrativo.</p>
        </div>
      </div>
    </Layout>
  );
}
