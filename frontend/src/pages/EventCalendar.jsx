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
        <div className="inline-flex items-center gap-2 bg-primary-soft px-4 py-1.5 rounded-full mb-4 border border-outline-variant">
          <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_month</span>
          <span className="text-primary font-bold uppercase tracking-wider text-xs font-display">Community Calendar</span>
        </div>
        <h1 style={{ fontWeight: 800, marginBottom: '8px' }}>
          The <span style={{ color: 'var(--secondary)' }}>Grid of Joy</span>: {monthName}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
          Explore 100% free kids events by month or tap specific days with interactive indicators to discover local fun!
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
          <div className="calendar-view sticker-shadow" style={{ padding: '24px', marginTop: 0, border: '1px solid var(--border-soft)' }}>
            <div className="calendar-header" style={{ marginBottom: '20px' }}>
              <button className="btn btn-outline btn-icon-only" style={{ width: '40px', height: '40px' }} onClick={handlePrevMonth}>
                <ChevronLeft size={18} />
              </button>
              <h2 className="calendar-title" style={{ margin: 0, fontSize: '1.35rem' }}>{currentDate.toLocaleDateString('en-AU', { month: 'long' })}</h2>
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
                  return <div key={day.id} className="calendar-grid-item bg-surface-container/20 rounded-lg opacity-25 border border-border-soft"></div>;
                }

                const dayEvents = getEventsForDate(day.dateString);
                const hasEvents = dayEvents.length > 0;
                const isSelected = selectedDateStr === day.dateString;
                
                // Check if today
                const today = new Date();
                const isToday = today.getDate() === day.dayNumber && 
                                today.getMonth() === month && 
                                today.getFullYear() === year;

                // Color variables for specific categories
                let cellStyle = { 
                  padding: '8px', 
                  borderRadius: 'var(--radius-md)', 
                  minHeight: '80px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: isSelected ? '2px solid var(--secondary)' : '1px solid var(--border-soft)',
                  backgroundColor: isToday ? 'var(--secondary-soft)' : 'var(--bg-white)',
                  transition: 'var(--transition-bouncy)'
                };

                const firstEvent = dayEvents[0];
                if (hasEvents && firstEvent) {
                  const cat = firstEvent.category?.toLowerCase() || '';
                  if (cat.includes('playground')) {
                    cellStyle.backgroundColor = 'var(--secondary-soft)';
                    cellStyle.border = isSelected ? '2px solid var(--secondary)' : '2px solid var(--yellow)';
                  } else if (cat.includes('library')) {
                    cellStyle.backgroundColor = 'var(--primary-soft)';
                    cellStyle.border = isSelected ? '2px solid var(--secondary)' : '2px solid var(--primary)';
                  } else {
                    cellStyle.backgroundColor = 'var(--teal-soft)';
                    cellStyle.border = isSelected ? '2px solid var(--secondary)' : '2px solid var(--teal)';
                  }
                }

                return (
                  <div 
                    key={day.id} 
                    className="calendar-grid-item hover:scale-[1.03] cursor-pointer group"
                    onClick={() => handleSelectDay(day)}
                    style={cellStyle}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', width: '100%' }}>
                      <span className="calendar-day-number" style={{ 
                        fontSize: '1rem', 
                        fontWeight: '800',
                        color: hasEvents ? 'var(--text-dark)' : 'var(--text-muted)'
                      }}>{day.dayNumber}</span>
                      {hasEvents && (
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--secondary)' }} />
                      )}
                    </div>
                    
                    {hasEvents && firstEvent && (
                      <div style={{ textAlign: 'left', marginTop: '4px' }}>
                        <span style={{ 
                          fontSize: '8px', 
                          fontWeight: '900', 
                          textTransform: 'uppercase', 
                          padding: '1px 4px', 
                          borderRadius: '4px',
                          backgroundColor: firstEvent.category?.toLowerCase().includes('playground') ? 'var(--secondary)' :
                                           firstEvent.category?.toLowerCase().includes('library') ? 'var(--primary)' : 'var(--teal)',
                          color: 'white'
                        }}>
                          {firstEvent.category || 'Event'}
                        </span>
                        <p style={{ 
                          fontSize: '10px', 
                          fontWeight: '800', 
                          lineHeight: '1.2', 
                          marginTop: '2px',
                          color: 'var(--text-dark)',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {firstEvent.title}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Column 2: Chronological Monthly / Selected Day Event Panel */}
          <div className="bg-surface-container-low rounded-3xl p-6 border border-outline-variant flex flex-col gap-6" style={{ minHeight: '520px' }}>
            
            {/* Side Panel Header */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              borderBottom: '1px solid var(--border-soft)', 
              paddingBottom: '16px',
              textAlign: 'left'
            }}>
              <div>
                <h3 style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-dark)', margin: 0 }}>
                  {sidePanelTitle}
                </h3>
                {hasSelectedDay && (
                  <button 
                    onClick={() => { setSelectedDateStr(''); setSelectedDayEvents([]); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--secondary)',
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
              <span className="bg-primary text-on-primary text-xs font-bold px-3 py-1 rounded-full">
                {displayEvents.length} {displayEvents.length === 1 ? 'Event' : 'Events'}
              </span>
            </div>

            {/* List panel */}
            <div className="custom-scrollbar pr-2 space-y-6" style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              overflowY: 'auto', 
              maxHeight: '480px'
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
                displayEvents.map((event, idx) => {
                  const eventDate = new Date(event.date);
                  const dayName = eventDate.toLocaleDateString('en-AU', { weekday: 'short' });
                  const dayNumber = eventDate.toLocaleDateString('en-AU', { day: 'numeric' });
                  
                  // Rotate angles for sticker effect
                  const rotateDegs = idx % 3 === 0 ? '-1.5deg' : idx % 3 === 1 ? '1deg' : '-0.5deg';
                  
                  // Category color theme
                  let borderCol = 'var(--teal)';
                  let badgeCol = 'var(--teal)';
                  let textCol = 'var(--teal)';
                  const cat = event.category?.toLowerCase() || '';
                  if (cat.includes('playground')) {
                    borderCol = 'var(--yellow)';
                    badgeCol = 'var(--secondary)';
                    textCol = 'var(--secondary)';
                  } else if (cat.includes('library')) {
                    borderCol = 'var(--primary)';
                    badgeCol = 'var(--primary)';
                    textCol = 'var(--primary)';
                  }

                  return (
                    <div 
                      key={event.id}
                      className="tilted-card bg-surface-container-lowest p-4 rounded-xl sticker-shadow relative cursor-pointer"
                      style={{
                        transform: `rotate(${rotateDegs})`,
                        border: `2px solid ${borderCol}`
                      }}
                    >
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        {/* Left: Date badge */}
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '54px',
                          height: '54px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: `${badgeCol}15`,
                          color: textCol,
                          border: `1px solid ${borderCol}30`,
                          flexShrink: 0
                        }}>
                          <span style={{ fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', lineHeight: 1 }}>{dayName}</span>
                          <span style={{ fontSize: '1.2rem', fontWeight: '900', lineHeight: 1, marginTop: '2px' }}>{dayNumber}</span>
                        </div>

                        {/* Middle: Content */}
                        <div style={{ flexGrow: 1, minWidth: 0, textAlign: 'left' }}>
                          <span style={{ 
                            fontSize: '9px', 
                            fontWeight: '900', 
                            textTransform: 'uppercase', 
                            letterSpacing: '0.05em',
                            color: textCol,
                            display: 'inline-block' 
                          }}>
                            {event.category || 'General'}
                          </span>
                          <h4 style={{ 
                            fontWeight: '800', 
                            fontSize: '1rem', 
                            color: 'var(--text-dark)', 
                            margin: '2px 0 0 0', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'nowrap' 
                          }} title={event.title}>
                            {event.title}
                          </h4>
                          <div style={{ display: 'flex', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                              <Clock size={12} /> {event.time || 'Flexible'}
                            </span>
                            <span>•</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                              <MapPin size={12} /> {event.location?.split(',')[0]}
                            </span>
                          </div>
                        </div>

                        {/* Right: Action */}
                        <Link to={`/events/${event.id}`} className="btn btn-outline btn-icon-only" style={{ width: '36px', height: '36px', border: '1px solid var(--border-soft)', flexShrink: 0, padding: 0 }}>
                          <ArrowRight size={16} style={{ color: badgeCol }} />
                        </Link>
                      </div>
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
      `}</style>

    </div>
  );
}
