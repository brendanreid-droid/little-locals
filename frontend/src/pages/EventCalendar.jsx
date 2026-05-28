import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, Smile, Award, Clock, ArrowRight } from 'lucide-react';

export default function EventCalendar() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayEvents, setSelectedDayEvents] = useState([]);
  const [selectedDateStr, setSelectedDateStr] = useState('');

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

  // Get date metrics
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  // Create list of days including leading empty days
  const calendarDays = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push({ type: 'empty', id: `empty-${i}` });
  }
  for (let day = 1; day <= totalDays; day++) {
    const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    calendarDays.push({
      type: 'day',
      dayNumber: day,
      dateString: dayStr,
      id: `day-${day}`
    });
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDayEvents([]);
    setSelectedDateStr('');
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDayEvents([]);
    setSelectedDateStr('');
  };

  const handleSelectDay = (day) => {
    if (day.type === 'empty') return;
    const dayEvents = events.filter(e => e.date === day.dateString);
    setSelectedDayEvents(dayEvents);
    setSelectedDateStr(day.dateString);
  };

  // Check if events exist on date
  const getEventsForDate = (dateString) => {
    return events.filter(e => e.date === dateString);
  };

  const monthName = currentDate.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header section */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontWeight: 900, marginBottom: '8px' }}>
          Interactive <span className="text-gradient">Activity Calendar</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
          Tap on any day with a dot indicator to discover what 100% free activities are scheduled.
        </p>
      </div>

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
          <p style={{ fontWeight: '700', color: 'var(--text-muted)' }}>Loading event calendar...</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px' }}>
          
          {/* Calendar Widget */}
          <div className="calendar-view">
            <div className="calendar-header">
              <button className="btn btn-outline btn-icon-only" onClick={handlePrevMonth}>
                <ChevronLeft size={20} />
              </button>
              <h2 className="calendar-title" style={{ margin: 0 }}>{monthName}</h2>
              <button className="btn btn-outline btn-icon-only" onClick={handleNextMonth}>
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="calendar-grid">
              {weekdays.map(day => (
                <div key={day} className="calendar-weekday">{day}</div>
              ))}
              
              {calendarDays.map((day) => {
                if (day.type === 'empty') {
                  return <div key={day.id} className="calendar-day empty-day"></div>;
                }

                const dayEvents = getEventsForDate(day.dateString);
                const hasEvents = dayEvents.length > 0;
                const isSelected = selectedDateStr === day.dateString;
                
                // Check if today
                const today = new Date();
                const isToday = today.getDate() === day.dayNumber && 
                                today.getMonth() === month && 
                                today.getFullYear() === year;

                return (
                  <div 
                    key={day.id} 
                    className={`calendar-day ${isToday ? 'calendar-day-today' : ''} ${isSelected ? 'calendar-day-selected' : ''}`}
                    onClick={() => handleSelectDay(day)}
                  >
                    <span className="calendar-day-number">{day.dayNumber}</span>
                    
                    {hasEvents && (
                      <div className="calendar-events-indicator">
                        {dayEvents.slice(0, 3).map((e, index) => (
                          <div 
                            key={e.id || index} 
                            className="calendar-dot"
                            style={{ 
                              backgroundColor: e.category === 'Playground' ? 'var(--teal)' : 
                                              e.category === 'Library' ? 'var(--secondary)' : 
                                              'var(--primary)' 
                            }}
                            title={e.title}
                          />
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="calendar-dot-multiple">+{dayEvents.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Day Events Drawer */}
          {selectedDateStr && (
            <div className="event-popover" style={{ animation: 'slideUp 0.3s cubic-bezier(0.165, 0.84, 0.44, 1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border-soft)', paddingBottom: '12px' }}>
                <h3 style={{ fontWeight: 900, color: 'var(--text-dark)' }}>
                  Activities on {new Date(selectedDateStr).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                <span className="badge badge-coral">{selectedDayEvents.length} {selectedDayEvents.length === 1 ? 'Event' : 'Events'}</span>
              </div>

              {selectedDayEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <Smile size={32} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
                  <p style={{ fontWeight: '600', color: 'var(--text-muted)' }}>No activities scheduled for this day yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {selectedDayEvents.map(event => (
                    <div 
                      key={event.id} 
                      style={{ 
                        backgroundColor: 'var(--bg-white)', 
                        padding: '20px', 
                        borderRadius: 'var(--radius-md)', 
                        border: '1px solid var(--border-soft)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        position: 'relative',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                      }}
                    >
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div>
                          <span className="badge badge-free" style={{ marginBottom: '8px', fontSize: '0.75rem' }}>
                            {event.category || 'General'}
                          </span>
                          <h4 style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-dark)' }}>{event.title}</h4>
                        </div>
                        <Link to={`/events/${event.id}`} className="btn btn-outline" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
                          View Details <ArrowRight size={14} />
                        </Link>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={14} style={{ color: 'var(--primary)' }} />
                          <span>{event.time || 'All Day / Flexible'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <MapPin size={14} style={{ color: 'var(--teal)' }} />
                          <span>{event.location}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Award size={14} style={{ color: 'var(--secondary)' }} />
                          <span>Ages: {event.age_group || 'All Ages'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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
