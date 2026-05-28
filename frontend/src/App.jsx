import { BrowserRouter as Router, Routes, Route, NavLink, Link } from 'react-router-dom';
import { Sparkles, Calendar as CalendarIcon, Grid, Lock, Heart } from 'lucide-react';
import EventList from './pages/EventList';
import EventCalendar from './pages/EventCalendar';
import EventDetail from './pages/EventDetail';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import EventForm from './pages/EventForm';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app-container">
        
        {/* Beautiful Dynamic Header */}
        <header className="header">
          <Link to="/" className="logo-container">
            <div className="logo-icon">
              <Sparkles size={20} fill="white" />
            </div>
            <span>Little Locals</span>
          </Link>

          {/* Navigation Links */}
          <nav className="nav-links">
            <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Grid size={16} /> Directory
              </span>
            </NavLink>
            <NavLink to="/calendar" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <CalendarIcon size={16} /> Calendar Grid
              </span>
            </NavLink>
            <NavLink to="/admin/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={16} /> Admin Portal
              </span>
            </NavLink>
          </nav>
        </header>

        {/* Core dynamic body content */}
        <main style={{ flexGrow: 1, minHeight: '60vh' }}>
          <Routes>
            <Route path="/" element={<EventList />} />
            <Route path="/calendar" element={<EventCalendar />} />
            <Route path="/events/:id" element={<EventDetail />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/events/new" element={<EventForm />} />
            <Route path="/admin/events/:id/edit" element={<EventForm />} />
          </Routes>
        </main>

        {/* Delightful Footer */}
        <footer className="footer">
          <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h4 style={{ fontWeight: 800, color: 'var(--text-dark)' }}>Little Locals Central Coast</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Providing parents with a centralised directory for 100% free events, activities, playground reviews, and family-friendly things to do. We make finding local fun simple and cost-free.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', fontSize: '0.85rem', marginTop: '12px' }}>
              <span>Made with</span>
              <Heart size={14} style={{ color: 'var(--primary)' }} fill="var(--primary)" />
              <span>for Central Coast families © {new Date().getFullYear()}</span>
            </div>
            <div style={{ fontSize: '0.75rem', marginTop: '8px' }}>
              <Link to="/admin/login" style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>
                Admin Portal Login
              </Link>
            </div>
          </div>
        </footer>

      </div>
    </Router>
  );
}

export default App;
