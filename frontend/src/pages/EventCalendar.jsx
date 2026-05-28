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

  // Get events in the current month in chronological order
  const currentMonthEvents = events
    .filter(event => {
      if (!event.date) return false;
      const eventDate = new Date(event.date);
      return eventDate.getMonth() === month && eventDate.getFullYear() === year;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // Determine active view events
  const hasSelectedDay = !!selectedDateStr;
  const displayEvents = hasSelectedDay ? selectedDayEvents : currentMonthEvents;
  const sidePanelTitle = hasSelectedDay 
    ? `Activities on ${new Date(selectedDateStr).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}`
    : `Activities in ${currentDate.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}`;

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1280px', margin: '0 auto' }}>
      
      {/* Header section */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontWeight: 900, marginBottom: '8px' }}>
          Interactive <span className="text-gradient">Activity Calendar</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
          Explore 100% free kids events by month or tap specific days with dot indicators to narrow down your search!
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
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
          gap: '32px',
          alignItems: 'start'
        }}>
          
          {/* Column 1: Calendar Grid (Tighter & Smaller) */}
          <div className="calendar-view" style={{ padding: '24px', marginTop: 0 }}>
            <div className="calendar-header" style={{ marginBottom: '20px' }}>
              <button className="btn btn-outline btn-icon-only" style={{ width: '40px', height: '40px' }} onClick={handlePrevMonth}>
                <ChevronLeft size={18} />
              </button>
              <h2 className="calendar-title" style={{ margin: 0, fontSize: '1.35rem' }}>{monthName}</h2>
              <button className="btn btn-outline btn-icon-only" style={{ width: '40px', height: '40px' }} onClick={handleNextMonth}>
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="calendar-grid" style={{ gap: '8px' }}>
              {weekdays.map(day => (
                <div key={day} className="calendar-weekday" style={{ paddingBottom: '8px', fontSize: '0.8rem' }}>{day}</div>
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
                    style={{ 
                      padding: '8px', 
                      borderRadius: 'var(--radius-md)', 
                      minHeight: '52px'
                    }}
                  >
                    <span className="calendar-day-number" style={{ fontSize: '0.9rem', fontWeight: '800' }}>{day.dayNumber}</span>
                    
                    {hasEvents && (
                      <div className="calendar-events-indicator" style={{ marginTop: '2px', gap: '3px' }}>
                        {dayEvents.slice(0, 3).map((e, index) => (
                          <div 
                            key={e.id || index} 
                            className="calendar-dot"
                            style={{ 
                              width: '6px',
                              height: '6px',
                              backgroundColor: e.category === 'Playground' ? 'var(--teal)' : 
                                              e.category === 'Library' ? 'var(--secondary)' : 
                                              'var(--primary)' 
                            }}
                            title={e.title}
                          />
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="calendar-dot-multiple" style={{ fontSize: '0.6rem' }}>+{dayEvents.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Column 2: Chronological Monthly / Selected Day Event Panel */}
          <div style={{
            backgroundColor: 'var(--bg-white)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-soft)',
            padding: '24px',
            boxShadow: 'var(--shadow-light)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            alignSelf: 'stretch',
            minHeight: '380px'
          }}>
            
            {/* Side Panel Header */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              borderBottom: '1px solid var(--border-soft)', 
              paddingBottom: '12px',
              textAlign: 'left'
            }}>
              <div>
                <h3 style={{ fontWeight: 900, fontSize: '1.2rem', color: 'var(--text-dark)', margin: 0 }}>
                  {sidePanelTitle}
                </h3>
                {hasSelectedDay && (
                  <button 
                    onClick={() => { setSelectedDateStr(''); setSelectedDayEvents([]); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      fontWeight: '800',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      padding: '4px 0 0 0',
                      display: 'block'
                    }}
                  >
                    ← Show all events this month
                  </button>
                )}
              </div>
              <span className="badge badge-coral" style={{ flexShrink: 0 }}>
                {displayEvents.length} {displayEvents.length === 1 ? 'Activity' : 'Activities'}
              </span>
            </div>

            {/* List panel */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px', 
              overflowY: 'auto', 
              maxHeight: '480px', 
              paddingRight: '4px' 
            }}>
              {displayEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1 }}>
                  <Smile size={36} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
                  <p style={{ fontWeight: '700', color: 'var(--text-dark)', fontSize: '1rem', margin: 0 }}>No activities scheduled</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px', maxWidth: '240px', margin: '4px auto 0' }}>
                    {hasSelectedDay ? 'No events for this specific day yet.' : 'No events scheduled for this month.'}
                  </p>
                </div>
              ) : (
                displayEvents.map(event => {
                  const eventDate = new Date(event.date);
                  const dayName = eventDate.toLocaleDateString('en-AU', { weekday: 'short' });
                  const dayNumber = eventDate.toLocaleDateString('en-AU', { day: 'numeric' });
                  
                  return (
                    <div 
                      key={event.id}
                      style={{
                        display: 'flex',
                        gap: '12px',
                        backgroundColor: 'var(--bg-cream)',
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-soft)',
                        alignItems: 'center',
                        transition: 'var(--transition-smooth)'
                      }}
                      className="chronological-card"
                    >
                      {/* Left: Date badge */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '46px',
                        height: '46px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--primary-soft)',
                        color: 'var(--primary)',
                        flexShrink: 0
                      }}>
                        <span style={{ fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase', lineHeight: 1 }}>{dayName}</span>
                        <span style={{ fontSize: '1.05rem', fontWeight: '900', lineHeight: 1, marginTop: '2px' }}>{dayNumber}</span>
                      </div>

                      {/* Middle: Content */}
                      <div style={{ flexGrow: 1, minWidth: 0, textAlign: 'left' }}>
                        <span className="badge badge-free" style={{ fontSize: '0.6rem', padding: '2px 6px', marginBottom: '4px', display: 'inline-flex' }}>
                          {event.category || 'General'}
                        </span>
                        <h4 style={{ fontWeight: '800', fontSize: '0.88rem', color: 'var(--text-dark)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={event.title}>
                          {event.title}
                        </h4>
                        <div style={{ display: 'flex', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <span>{event.time || 'Flexible'}</span>
                          <span>•</span>
                          <span>{event.location?.split(',')[0]}</span>
                        </div>
                      </div>

                      {/* Right: Action */}
                      <Link to={`/events/${event.id}`} className="btn btn-outline btn-icon-only" style={{ width: '32px', height: '32px', border: '1px solid var(--border-soft)', flexShrink: 0, padding: 0 }}>
                        <ArrowRight size={14} style={{ color: 'var(--primary)' }} />
                      </Link>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      )}
      
      {/* CSS Animation helper */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .chronological-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(45, 20, 80, 0.04);
          border-color: var(--primary) !important;
        }
      `}</style>

    </div>
  );
}
