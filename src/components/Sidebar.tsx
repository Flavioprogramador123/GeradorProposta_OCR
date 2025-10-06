import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Sun, 
  Users, 
  Image, 
  BarChart3, 
  Settings,
  Zap
} from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();

  const menuItems = [
    { path: '/', icon: Home, label: 'Dashboard', color: 'blue' },
    { path: '/propostas', icon: Sun, label: 'Solar Generator', color: 'yellow' },
    { path: '/gestao', icon: Users, label: 'Gestão', color: 'green' },
    { path: '/studio', icon: Image, label: 'Image Studio', color: 'purple' },
    { path: '/solar', icon: BarChart3, label: 'Solar Analysis', color: 'orange' },
    { path: '/automacao', icon: Zap, label: 'Automação', color: 'red' },
    { path: '/admin', icon: Settings, label: 'Admin', color: 'gray' }
  ];

  return (
    <aside className="w-64 bg-white shadow-sm min-h-screen">
      <nav className="p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? `bg-${item.color}-100 text-${item.color}-700 border-l-4 border-${item.color}-500`
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;



