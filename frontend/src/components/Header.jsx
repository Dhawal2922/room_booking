import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Calendar, LayoutDashboard, Download, Settings as SettingsIcon, LogOut } from 'lucide-react';
import { exportBookings } from '../api';
import { cn } from '../utils';

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();

  const links = [
    { path: '/', label: 'Manage Rooms', icon: LayoutDashboard },
    { path: '/book', label: 'Book Room', icon: Calendar },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    navigate('/login');
  };

  return (
    <header className="bg-surface border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">
            Room Bookings
          </h1>
        </div>
        
        <nav className="flex items-center gap-3">
          <div className="hidden md:flex bg-gray-100/80 p-1 rounded-xl">
            {links.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition",
                  location.pathname === path 
                    ? "bg-white text-textMain shadow-sm" 
                    : "text-secondary hover:text-textMain hover:bg-white/50"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </div>

          <button 
            onClick={exportBookings}
            className="flex items-center gap-2 btn-secondary"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <div className="h-6 w-px bg-gray-300 mx-1"></div>

          <Link to="/settings" className="p-2 text-gray-400 hover:text-gray-700 transition" title="Settings">
            <SettingsIcon className="w-5 h-5" />
          </Link>

          <button 
            onClick={handleLogout}
            className="p-2 text-red-400 hover:text-red-600 transition"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </nav>
      </div>
    </header>
  );
}
