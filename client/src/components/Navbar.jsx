import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
export default function Navbar() {
  const { user, logout, isHR } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  const links = isHR
    ? [['Employees', '/employees'], ['Market', '/market'], ['Risk', '/risk'], ['Graph', '/graph'], ['Reviews', '/reviews'], ['Report', '/report']]
    : [['My Profile', `/employees/${user.employeeId}`], ['Market', '/market'], ['Reviews', '/reviews']];
  return (
    <nav className="print:hidden border-b bg-white px-6 py-3 flex gap-5 items-center flex-wrap">
      <Link to="/" className="font-bold text-xl text-blue-700">SkillSight</Link>
      {links.map(([label, url]) => <Link key={url} className="text-sm hover:underline" to={url}>{label}</Link>)}
      <span className="ml-auto text-xs text-gray-500">{user.email}</span>
      <button className="rounded border px-3 py-1 text-sm" onClick={() => { logout(); navigate('/login'); }}>Logout</button>
    </nav>
  );
}
