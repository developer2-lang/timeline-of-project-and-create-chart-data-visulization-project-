import { NavLink, useLocation } from 'react-router-dom';
import { RotateCcw, Trash2, Database } from 'lucide-react';
import { useToast } from './ToastContext';
import { useModal } from './ModalContext';
import { isSupabaseConfigured } from '../lib/supabase';

interface NavbarProps {
  onDemoData: () => void;
  onReload: () => void;
  onClear: () => void;
  busy: boolean;
}

export function Navbar({ onDemoData, onReload, onClear, busy }: NavbarProps) {
  const location = useLocation();
  const { toast } = useToast();
  const { confirmBox } = useModal();

  const handleReload = () => {
    onReload();
    if (!isSupabaseConfigured) {
      toast('Reloaded from local data.');
    }
  };

  const handleClear = () => {
    confirmBox(
      'Clear everything',
      isSupabaseConfigured
        ? 'This removes all timelines, their stages, and your custom holidays from Supabase, leaving an empty app for real work. This cannot be undone.'
        : 'This removes all timelines and resets to default holidays. This cannot be undone.',
      () => onClear()
    );
  };

  const handleDemo = () => onDemoData();

  return (
    <div className="topbar">
      <div className="brand" role="img" aria-label="IUOVA Design Company">
        IUOVA
      </div>
      <div className="brand-rule"></div>
      <nav className="nav" aria-label="Primary">
        <NavLink to="/" end className={({ isActive }) => (isActive && location.pathname === '/' ? 'on' : '')}>
          Timelines
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => (isActive ? 'on' : '')}>
          Settings
        </NavLink>
      </nav>
      <div className="topbar-actions">
        <span className="demo-badge">Demo data</span>
        <button className="btn onDark sm" onClick={handleReload} disabled={busy}>
          <RotateCcw size={14} /> Reload
        </button>
        <button className="btn onDark sm" onClick={handleClear} disabled={busy}>
          <Trash2 size={14} /> Clear
        </button>
        <button className="btn onDark sm" onClick={handleDemo} disabled={busy}>
          <Database size={14} /> Demo data
        </button>
      </div>
    </div>
  );
}
