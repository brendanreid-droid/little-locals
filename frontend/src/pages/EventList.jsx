import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Search, Calendar as CalendarIcon, MapPin, Smile, Award, ArrowRight } from 'lucide-react';

export default function EventList() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedAge, setSelectedAge] = useState('All');

  const categories = ['All', 'Playground', 'Library', 'Art & Craft', 'Outdoors', 'Sports', 'Music & Storytime'];
  const ageGroups = ['All', '0-5 years', '6-12 years', 'Teens', 'All Ages'];

  useEffect(() => {
    async function fetchEvents() {
      try {
        const eventsCol = collection(db, 'events');
        const q = query(eventsCol, orderBy('date', 'asc'));
        const snapshot = await getDocs(q);
        const eventData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setEvents(eventData);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

  // Filter events based on search, category and age
  const filteredEvents = events.filter(event => {
    const matchesSearch = 
      (event.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (event.description?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (event.location?.toLowerCase() || '').includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === 'All' || event.category === selectedCategory;
    const matchesAge = selectedAge === 'All' || event.age_group === selectedAge;

    return matchesSearch && matchesCategory && matchesAge;
  });

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Joyful Hero Banner */}
      <div style={{ textAlign: 'center', marginBottom: '48px', animation: 'slideUp 0.4s ease' }}>
        <div style={{ display: 'inline-flex', padding: '6px 16px', background: 'hsl(14, 95%, 96%)', color: 'var(--primary)', borderRadius: '50px', fontWeight: '800', fontSize: '0.85rem', marginBottom: '16px', gap: '8px', alignItems: 'center' }}>
          <Smile size={16} /> 100% Free Family Fun on the Central Coast
        </div>
        <h1 style={{ fontWeight: 900, marginBottom: '16px', color: 'var(--text-dark)' }}>
          Discover <span className="text-gradient">Delightful Free Activities</span> for Kids
        </h1>
        <p style={{ fontSize: '1.15rem', color: 'var(--text-muted)', maxWidth: '650px', margin: '0 auto' }}>
          No paid ads, no hidden costs. Just centralise free events, activities, and playground reviews to keep your little locals happy.
        </p>
      </div>

      {/* Modern Search & Filters Bar */}
      <div style={{ 
        backgroundColor: 'var(--bg-white)', 
        borderRadius: 'var(--radius-lg)', 
        padding: '24px', 
        border: '1px solid var(--border-soft)', 
        boxShadow: 'var(--shadow-light)',
        marginBottom: '40px'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          
          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={20} />
            <input 
              type="text" 
              placeholder="Search playgrounds, libraries, parks..." 
              className="form-control"
              style={{ paddingLeft: '48px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Age Group Filter */}
          <div style={{ position: 'relative' }}>
            <select 
              className="form-control" 
              style={{ appearance: 'none' }}
              value={selectedAge}
              onChange={(e) => setSelectedAge(e.target.value)}
            >
              <option value="All">Age Group: All Ages</option>
              {ageGroups.filter(a => a !== 'All').map(age => (
                <option key={age} value={age}>{age}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Categories Carousel / Tabs */}
        <div>
          <div style={{ fontWeight: '800', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
            Filter by Category
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {categories.map(cat => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`btn ${isActive ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '8px 20px', fontSize: '0.85rem' }}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main events section */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ 
            width: '50px', 
            height: '50px', 
            border: '5px solid var(--border-soft)', 
            borderTopColor: 'var(--primary)', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }} />
          <p style={{ fontWeight: '700', color: 'var(--text-muted)' }}>Loading awesome events...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px', 
          backgroundColor: 'var(--bg-white)', 
          borderRadius: 'var(--radius-lg)', 
          border: '1px dashed var(--border-soft)' 
        }}>
          <Smile size={48} style={{ color: 'var(--primary)', marginBottom: '16px' }} />
          <h3 style={{ fontWeight: 800, fontSize: '1.4rem', marginBottom: '8px' }}>No free activities found</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px' }}>
            We couldn't find any activities matching your filters. Know of a free local kids event? She can update this site when submitted!
          </p>
          <button className="btn btn-outline" onClick={() => { setSearchTerm(''); setSelectedCategory('All'); setSelectedAge('All'); }}>
            Reset Filters
          </button>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontWeight: 900 }}>Upcoming Fun ({filteredEvents.length})</h2>
            <Link to="/calendar" className="btn btn-outline" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
              <CalendarIcon size={16} /> View Calendar Grid
            </Link>
          </div>

          <div className="event-grid">
            {filteredEvents.map(event => (
              <article key={event.id} className="event-card">
                <div className="event-image-container">
                  <span className="event-price-tag">FREE</span>
                  <img 
                    src={event.image_url || 'https://images.unsplash.com/photo-1596464716127-f2a82984de30?auto=format&fit=crop&w=600&q=80'} 
                    alt={event.title} 
                    className="event-image" 
                  />
                  <div className="event-details-bar">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CalendarIcon size={12} /> {event.date ? new Date(event.date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Flexible'}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Award size={12} /> {event.age_group || 'All Ages'}
                    </span>
                  </div>
                </div>
                
                <div className="event-card-content">
                  <span className="badge badge-coral" style={{ alignSelf: 'flex-start' }}>
                    {event.category || 'General'}
                  </span>
                  <h3 className="event-card-title">{event.title}</h3>
                  <p className="event-card-description">{event.description}</p>
                  
                  <div className="event-card-footer">
                    <div className="event-location">
                      <MapPin size={14} style={{ color: 'var(--primary)' }} />
                      <span>{event.location?.split(',')[0]}</span>
                    </div>
                    <Link to={`/events/${event.id}`} className="btn btn-secondary btn-icon-only" title="View details">
                      <ArrowRight size={18} />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
      
      {/* CSS Animation helper */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

    </div>
  );
}
