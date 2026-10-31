import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Loading } from './ui';
export default function ProtectedRoute({ hrOnly = false, children }) {
  const { user, loading, isHR } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (hrOnly && !isHR) return <div className="p-8 text-red-600">403 — HR access only.</div>;
  return children || <Outlet />;
}
