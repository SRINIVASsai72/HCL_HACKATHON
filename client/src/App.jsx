import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { Loading } from './components/ui';
import LoginPage from './pages/LoginPage';
import EmployeesPage from './pages/EmployeesPage';
import ProfilePage from './pages/ProfilePage';
import ReviewsPage from './pages/ReviewsPage';
import MarketPage from './pages/MarketPage';
import RiskPage from './pages/RiskPage';
import CareerPage from './pages/CareerPage';
import GraphPage from './pages/GraphPage';
import ReportPage from './pages/ReportPage';
function Home() {
  const { user, loading, isHR } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={isHR ? '/employees' : `/employees/${user.employeeId}`} replace />;
}
export default function App() {
  return <>
    <Navbar />
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Home />} />
      <Route path="/employees" element={<ProtectedRoute hrOnly><EmployeesPage /></ProtectedRoute>} />
      <Route path="/employees/:id" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/employees/:id/career" element={<ProtectedRoute><CareerPage /></ProtectedRoute>} />
      <Route path="/reviews" element={<ProtectedRoute><ReviewsPage /></ProtectedRoute>} />
      <Route path="/market" element={<ProtectedRoute><MarketPage /></ProtectedRoute>} />
      <Route path="/risk" element={<ProtectedRoute hrOnly><RiskPage /></ProtectedRoute>} />
      <Route path="/graph" element={<ProtectedRoute hrOnly><GraphPage /></ProtectedRoute>} />
      <Route path="/report" element={<ProtectedRoute hrOnly><ReportPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </>;
}
