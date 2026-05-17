import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';

export default function Layout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1" style={{ backgroundColor: 'var(--paper)' }}>
        <div className="max-w-6xl mx-auto px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
