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
  const sidePanelTitle = hasSelectedDay && !isNaN(new Date(selectedDateStr).getTime())
    ? `Activities on ${new Date(selectedDateStr).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}`
    : `Activities in ${currentDate.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}`;

  const featuredEvent = events.find(e => e.is_featured) || events[0];

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1280px', margin: '0 auto' }}>
      
      {/* Header section */}
      <div 
        style={{ 
          display: 'flex', 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'flex-end', 
          flexWrap: 'wrap',
          gap: '24px',
          marginBottom: '48px',
          textAlign: 'left'
        }} 
        className="calendar-header-flex"
      >
        <div style={{ maxWidth: '700px' }}>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px', 
            backgroundColor: 'var(--primary-soft)', 
            color: 'var(--primary)', 
            padding: '6px 16px', 
            borderRadius: '50px', 
            marginBottom: '16px',
            border: '2px solid var(--text-dark)',
            fontWeight: '800',
            fontSize: '0.8rem',
            letterSpacing: '0.05em',
            textTransform: 'uppercase'
          }}>
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_month</span>
            Community Calendar
          </div>
          <h1 style={{ 
            fontFamily: 'var(--font-display)',
            fontSize: '2.5rem', 
            fontWeight: '900', 
            color: 'var(--primary)', 
            margin: 0,
            lineHeight: '1.1'
          }}>
            The <span style={{ color: 'var(--yellow)' }}>Grid of Joy</span>: {monthName}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginTop: '8px', fontWeight: '500' }}>
            Your ultimate guide to 100% free family fun on the Central Coast. Every day is a new adventure.
          </p>
        </div>
        
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px', 
            backgroundColor: 'var(--bg-white)', 
            padding: '8px', 
            borderRadius: '16px', 
            border: '3px solid var(--text-dark)',
            boxShadow: '4px 4px 0px 0px var(--text-dark)'
          }}
        >
          <button 
            onClick={handlePrevMonth}
            style={{ 
              padding: '8px', 
              borderRadius: '8px', 
              border: 'none', 
              backgroundColor: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'var(--transition-smooth)'
            }}
            className="nav-arrow-btn"
          >
            <ChevronLeft size={24} />
          </button>
          <span style={{ 
            fontSize: '1.3rem', 
            fontWeight: '900', 
            fontFamily: 'var(--font-display)',
            color: 'var(--primary)',
            padding: '0 8px'
          }}>
            {currentDate.toLocaleDateString('en-AU', { month: 'long' })}
          </span>
          <button 
            onClick={handleNextMonth}
            style={{ 
              padding: '8px', 
              borderRadius: '8px', 
              border: 'none', 
              backgroundColor: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'var(--transition-smooth)'
            }}
            className="nav-arrow-btn"
          >
            <ChevronRight size={24} />
          </button>
        </div>
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
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(12, 1fr)', 
            gap: '32px',
            alignItems: 'start'
          }}
          className="calendar-main-grid"
        >
          
          {/* Column 1: Calendar Grid (8 columns span on lg) */}
          <div 
            className="calendar-col sticker-shadow" 
            style={{ 
              gridColumn: 'span 8 / span 8',
              backgroundColor: 'var(--bg-white)',
              borderRadius: '24px',
              border: '3px solid var(--text-dark)',
              padding: '24px'
            }}
          >
            <div className="calendar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
              {weekdays.map(day => (
                <div 
                  key={day} 
                  className="calendar-weekday" 
                  style={{ 
                    textAlign: 'center',
                    fontWeight: '900',
                    color: 'var(--primary)',
                    opacity: 0.5,
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    paddingBottom: '12px'
                  }}
                >
                  {day}
                </div>
              ))}
              
              {calendarDays.map((day) => {
                if (day.type === 'empty') {
                  return (
                    <div 
                      key={day.id} 
                      className="calendar-grid-item"
                      style={{
                        backgroundColor: 'var(--bg-cream)',
                        opacity: 0.25,
                        borderRadius: '12px',
                        border: '1px dashed var(--text-dark)'
                      }}
                    />
                  );
                }

                const dayEvents = getEventsForDate(day.dateString);
                const hasEvents = dayEvents.length > 0;
                const isSelected = selectedDateStr === day.dateString;
                
                // Check if today
                const today = new Date();
                const isToday = today.getDate() === day.dayNumber && 
                                today.getMonth() === month && 
                                today.getFullYear() === year;

                // Stitch category color alignment
                let cellStyle = { 
                  padding: '10px', 
                  borderRadius: '12px', 
                  minHeight: '90px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: isSelected ? '3px solid var(--secondary)' : '2.5px solid var(--border-soft)',
                  backgroundColor: isToday ? 'var(--secondary-soft)' : 'var(--bg-white)',
                  transition: 'var(--transition-bouncy)',
                  boxShadow: isSelected ? '0 0 12px rgba(142, 78, 0, 0.2)' : 'none'
                };

                const firstEvent = dayEvents[0];
                if (hasEvents && firstEvent) {
                  const cat = firstEvent.category?.toLowerCase() || '';
                  if (cat.includes('playground')) {
                    cellStyle.backgroundColor = 'var(--secondary-soft)';
                    cellStyle.border = isSelected ? '3px solid var(--secondary)' : '2.5px solid var(--yellow)';
                  } else if (cat.includes('library')) {
                    cellStyle.backgroundColor = 'var(--primary-soft)';
                    cellStyle.border = isSelected ? '3px solid var(--secondary)' : '2.5px solid var(--primary)';
                  } else {
                    cellStyle.backgroundColor = 'var(--yellow-soft)';
                    cellStyle.border = isSelected ? '3px solid var(--secondary)' : '2.5px solid var(--teal-soft)';
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
                        fontSize: '1.1rem', 
                        fontWeight: '900',
                        fontFamily: 'var(--font-display)',
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
                          padding: '1px 5px', 
                          borderRadius: '4px',
                          backgroundColor: 'var(--text-dark)',
                          color: 'white'
                        }}>
                          {firstEvent.category || 'Event'}
                        </span>
                        <p style={{ 
                          fontSize: '10px', 
                          fontWeight: '900', 
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

          {/* Column 2: Sidebar (4 columns span on lg) */}
          <div 
            className="sidebar-col" 
            style={{ 
              gridColumn: 'span 4 / span 4',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px'
            }}
          >
            
            {/* Featured Event Hero Banner */}
            <div 
              className="relative overflow-hidden rounded-3xl group sticker-shadow" 
              style={{ 
                height: '240px', 
                border: '3px solid var(--text-dark)', 
                position: 'relative',
                cursor: 'pointer'
              }}
            >
              <img 
                alt="Featured Event" 
                src={featuredEvent?.image_url || "https://lh3.googleusercontent.com/aida/ADBb0ugOiQ3gZBCwCdosX9TkdFTd5py-PmDUoK7pld5P-pt5Its8TqnCrvGQo0p-w6f4sGITlN8YeRe-fgYOzdLgn9mnsYg8Wu7hkPESn8sQKQH04gEaWTKK4nkAV2X9XQOrOajLcZhmX-PhQWCLNul7gNU_fsbgwYe1XKtjuuf8zKLbh8JHwBdnvAmDA8gnso9bAsojss3lCCnqVMmUqaDBQlvENNtAqlsO-v3vMYmZgXlsypWlGE_pz_Upzvk"} 
                style={{ 
                  position: 'absolute', 
                  inset: 0, 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover',
                  transition: 'transform 0.5s ease-out'
                }} 
                className="featured-image"
              />
              <div style={{ 
                position: 'absolute', 
                inset: 0, 
                background: 'linear-gradient(to top, rgba(3, 63, 29, 0.95) 0%, rgba(3, 63, 29, 0.1) 100%)' 
              }} />
              <div style={{ 
                position: 'absolute', 
                bottom: 0, 
                left: 0, 
                padding: '20px', 
                color: 'white',
                textAlign: 'left'
              }}>
                <div style={{ 
                  backgroundColor: 'var(--yellow)', 
                  color: 'var(--text-dark)', 
                  fontSize: '10px', 
                  fontWeight: '900', 
                  textTransform: 'uppercase', 
                  padding: '4px 10px', 
                  borderRadius: '8px', 
                  display: 'inline-block', 
                  marginBottom: '8px',
                  border: '1.5px solid var(--text-dark)'
                }}>
                  Featured Event
                </div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: '900', margin: 0, lineHeight: '1.2' }}>
                  {featuredEvent?.title || "The Entrance Music Fest"}
                </h3>
                <p style={{ opacity: 0.85, fontSize: '0.85rem', marginTop: '4px' }}>
                  {featuredEvent && featuredEvent.date && !isNaN(new Date(featuredEvent.date).getTime())
                    ? `${new Date(featuredEvent.date).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' })} • ${featuredEvent.time}`
                    : "Saturday, June 20th • All Ages Welcome"}
                </p>
              </div>
            </div>

            {/* Event List panel */}
            <div 
              className="bg-surface-container-low rounded-3xl p-6 border border-outline-variant flex flex-col gap-6" 
              style={{ 
                border: '3px solid var(--text-dark)', 
                boxShadow: '6px 6px 0px 0px var(--text-dark)', 
                backgroundColor: 'var(--bg-white)', 
                borderRadius: '24px' 
              }}
            >
              
              {/* Side Panel Header */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                borderBottom: '3.5px solid var(--text-dark)', 
                paddingBottom: '16px',
                textAlign: 'left'
              }}>
                <div>
                  <h3 style={{ fontWeight: 900, fontSize: '1.35rem', color: 'var(--primary)', margin: 0 }}>
                    {hasSelectedDay ? 'Day Activities' : `${currentDate.toLocaleDateString('en-AU', { month: 'long' })} Highlights`}
                  </h3>
                  {hasSelectedDay && (
                    <button 
                      onClick={() => { setSelectedDateStr(''); setSelectedDayEvents([]); }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--secondary)',
                        fontWeight: '900',
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
                <span style={{
                  backgroundColor: 'var(--primary)',
                  color: 'white',
                  fontSize: '0.75rem',
                  fontWeight: '800',
                  padding: '4px 12px',
                  borderRadius: '50px',
                  border: '2px solid var(--text-dark)'
                }}>
                  {displayEvents.length} {displayEvents.length === 1 ? 'Event' : 'Events'}
                </span>
              </div>

              {/* Scrollable Feed */}
              <div className="custom-scrollbar pr-2" style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '16px', 
                overflowY: 'auto', 
                maxHeight: '380px',
                paddingRight: '6px'
              }}>
                {displayEvents.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <Smile size={36} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
                    <p style={{ fontWeight: '800', color: 'var(--text-dark)', fontSize: '1.05rem', margin: 0 }}>No activities scheduled</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px', maxWidth: '240px', margin: '4px auto 0' }}>
                      {hasSelectedDay ? 'No events for this specific day yet.' : 'No events scheduled for this month.'}
                    </p>
                  </div>
                ) : (
                  displayEvents.map((event, idx) => {
                    const eventDate = new Date(event.date || '');
                    const isDateValid = !isNaN(eventDate.getTime());
                    const dayName = isDateValid ? eventDate.toLocaleDateString('en-AU', { weekday: 'short' }) : 'Flexible';
                    const dayNumber = isDateValid ? eventDate.toLocaleDateString('en-AU', { day: 'numeric' }) : '';
                    const rotateDegs = idx % 3 === 0 ? '-1.5deg' : idx % 3 === 1 ? '1deg' : '-0.5deg';
                    
                    let borderCol = 'var(--text-dark)';
                    let badgeCol = 'var(--primary)';
                    let textCol = 'var(--primary)';
                    const cat = event.category?.toLowerCase() || '';
                    if (cat.includes('playground')) {
                      badgeCol = 'var(--secondary-soft)';
                      textCol = 'var(--secondary)';
                    } else if (cat.includes('library')) {
                      badgeCol = 'var(--primary-soft)';
                      textCol = 'var(--primary)';
                    } else {
                      badgeCol = 'var(--yellow-soft)';
                      textCol = 'var(--secondary)';
                    }

                    return (
                      <div 
                        key={event.id}
                        className="tilted-card sticker-shadow"
                        style={{
                          transform: `rotate(${rotateDegs})`,
                          border: `3px solid ${borderCol}`,
                          borderRadius: '16px',
                          padding: '16px',
                          backgroundColor: 'var(--bg-white)',
                          cursor: 'pointer'
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
                            borderRadius: '12px',
                            backgroundColor: badgeCol,
                            color: 'var(--text-dark)',
                            border: '2px solid var(--text-dark)',
                            flexShrink: 0
                          }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: '900', textTransform: 'uppercase', lineHeight: 1 }}>{dayName}</span>
                            <span style={{ fontSize: '1.2rem', fontWeight: '900', lineHeight: 1, marginTop: '2px' }}>{dayNumber}</span>
                          </div>

                          {/* Middle: Content */}
                          <div style={{ flexGrow: 1, minWidth: 0, textAlign: 'left' }}>
                            <span style={{ 
                              fontSize: '8px', 
                              fontWeight: '900', 
                              textTransform: 'uppercase', 
                              letterSpacing: '0.05em',
                              color: textCol,
                              display: 'inline-block' 
                            }}>
                              {event.category || 'General'}
                            </span>
                            <h4 style={{ 
                              fontWeight: '900', 
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
                          <Link to={`/events/${event.id}`} className="btn btn-outline" style={{ width: '36px', height: '36px', border: '2px solid var(--text-dark)', borderRadius: '50%', flexShrink: 0, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-white)', boxShadow: '2px 2px 0px 0px var(--text-dark)' }}>
                            <ArrowRight size={16} style={{ color: 'var(--text-dark)' }} />
                          </Link>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Promo Sticker (Got a local event to share?) */}
              <div 
                className="bg-yellow-soft sticker-shadow animate-bounce-subtle" 
                style={{ 
                  padding: '20px', 
                  borderRadius: '24px', 
                  border: '3px solid var(--text-dark)',
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  textAlign: 'center',
                  transform: 'rotate(-1deg)',
                  marginTop: '12px'
                }}
              >
                <div style={{ 
                  width: '44px', 
                  height: '44px', 
                  borderRadius: '50%', 
                  backgroundColor: 'var(--primary)', 
                  color: 'white', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  border: '2.5px solid var(--text-dark)',
                  marginBottom: '8px'
                }}>
                  <Smile size={24} />
                </div>
                <p style={{ fontWeight: '900', fontSize: '1.05rem', color: 'var(--text-dark)', lineHeight: '1.2', margin: 0 }}>
                  Got a local event to share?
                </p>
                <Link 
                  to="/admin" 
                  className="btn" 
                  style={{ 
                    marginTop: '12px', 
                    backgroundColor: 'var(--primary)', 
                    color: 'white', 
                    padding: '8px 20px', 
                    fontSize: '0.8rem',
                    fontWeight: '800',
                    borderRadius: '50px',
                    border: '2px solid var(--text-dark)',
                    boxShadow: '3px 3px 0px 0px var(--text-dark)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}
                >
                  Submit for FREE
                </Link>
              </div>

            </div>
          </div>

        </div>
      )}
      
      {/* CSS Animation & Responsive helper */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .featured-image:hover {
          transform: scale(1.08) !important;
        }

        .nav-arrow-btn:hover {
          background-color: var(--primary-soft) !important;
        }
        
        @media (max-width: 1024px) {
          .calendar-main-grid {
            grid-template-columns: 1fr !important;
          }
          .calendar-col {
            grid-column: span 12 / span 12 !important;
          }
          .sidebar-col {
            grid-column: span 12 / span 12 !important;
          }
        }
      `}</style>
    </div>
  );
}
