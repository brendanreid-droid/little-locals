import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, orderBy, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, Smile, Award, Clock, ArrowRight, X } from 'lucide-react';

export default function EventCalendar() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [selectedDayEvents, setSelectedDayEvents] = useState([]);
  const [selectedDateStr, setSelectedDateStr] = useState('');

  // Event suggestion state
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [suggestTitle, setSuggestTitle] = useState('');
  const [suggestDate, setSuggestDate] = useState('');
  const [suggestTime, setSuggestTime] = useState('');
  const [suggestLocation, setSuggestLocation] = useState('');
  const [suggestCategory, setSuggestCategory] = useState('Playgrounds');
  const [suggestAge, setSuggestAge] = useState('All Ages');
  const [suggestDescription, setSuggestDescription] = useState('');
  const [suggestLink, setSuggestLink] = useState('');
  const [suggestImageUrl, setSuggestImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSuggestSubmit = async (e) => {
    e.preventDefault();
    if (!suggestTitle || !suggestDate || !suggestLocation || !suggestCategory || !suggestAge || !suggestDescription) {
      alert("Please fill in all required fields.");
      return;
    }
    
    setSubmitting(true);
    try {
      const suggestionsCol = collection(db, 'suggestions');
      await addDoc(suggestionsCol, {
        title: suggestTitle,
        date: suggestDate,
        time: suggestTime || 'Flexible',
        location: suggestLocation,
        category: suggestCategory,
        age_group: suggestAge,
        description: suggestDescription,
        link: suggestLink || '',
        image_url: suggestImageUrl || '',
        source: 'User Suggestion',
        created_at: new Date().toISOString()
      });
      
      alert("Thank you! Your event suggestion has been submitted successfully and is now in our admin review queue.");
      
      // Reset form
      setSuggestTitle('');
      setSuggestDate('');
      setSuggestTime('');
      setSuggestLocation('');
      setSuggestCategory('Playgrounds');
      setSuggestAge('All Ages');
      setSuggestDescription('');
      setSuggestLink('');
      setSuggestImageUrl('');
      
      setShowSuggestModal(false);
    } catch (error) {
      console.error("Error submitting suggestion:", error);
      alert("Failed to submit suggestion: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

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
    <div className="calendar-view" style={{ maxWidth: '1280px', margin: '0 auto' }}>
      
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
            Your ultimate guide to family fun on the Central Coast. Every day is a new adventure.
          </p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          
          {/* Grid/List View Toggle */}
          <div style={{ 
            display: 'inline-flex', 
            backgroundColor: 'var(--bg-cream)', 
            borderRadius: '50px', 
            border: '2.5px solid var(--text-dark)', 
            padding: '3px',
            boxShadow: '2px 2px 0px 0px var(--text-dark)'
          }}>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              style={{
                padding: '6px 16px',
                fontSize: '0.8rem',
                fontWeight: '800',
                borderRadius: '50px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: viewMode === 'grid' ? 'var(--primary)' : 'transparent',
                color: viewMode === 'grid' ? 'white' : 'var(--text-dark)',
                transition: 'var(--transition-smooth)'
              }}
            >
              Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              style={{
                padding: '6px 16px',
                fontSize: '0.8rem',
                fontWeight: '800',
                borderRadius: '50px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: viewMode === 'list' ? 'var(--primary)' : 'transparent',
                color: viewMode === 'list' ? 'white' : 'var(--text-dark)',
                transition: 'var(--transition-smooth)'
              }}
            >
              List
            </button>
          </div>

          <button
            onClick={() => setShowSuggestModal(true)}
            style={{
              padding: '12px 24px',
              backgroundColor: 'var(--secondary)',
              color: 'white',
              borderRadius: '50px',
              border: '3px solid var(--text-dark)',
              fontWeight: '800',
              fontSize: '0.85rem',
              boxShadow: '3px 3px 0px 0px var(--text-dark)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
            className="suggest-btn-hover"
          >
            <Smile size={16} /> Suggest an Event
          </button>

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
          
          {/* Column 1: Calendar Grid / List View (8 columns span on lg) */}
          <div 
            className="calendar-col sticker-shadow" 
            style={{ 
              gridColumn: 'span 8 / span 8',
              backgroundColor: 'var(--bg-white)',
              borderRadius: '24px',
              border: '3px solid var(--text-dark)'
            }}
          >
            {viewMode === 'grid' ? (
              <div className="calendar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 'var(--calendar-gap, 8px)' }}>
                {weekdays.map(day => (
                  <div 
                    key={day} 
                    className="calendar-weekday" 
                    style={{ 
                      textAlign: 'center',
                      fontWeight: '900',
                      color: 'var(--primary)',
                      opacity: 0.5,
                      textTransform: 'uppercase'
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
                    borderRadius: '12px', 
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
                          <div className="calendar-dot-marker" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--secondary)' }} />
                        )}
                      </div>
                      
                      {hasEvents && firstEvent && (
                        <div className="calendar-day-details" style={{ textAlign: 'left', marginTop: '4px' }}>
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
            ) : (
              /* Gorgeous Chronological List View */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {currentMonthEvents.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                    <Smile size={36} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
                    <p style={{ fontWeight: '800', color: 'var(--text-dark)', fontSize: '1.05rem', margin: 0 }}>No activities scheduled</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>There are no events listed for {monthName} yet.</p>
                  </div>
                ) : (
                  currentMonthEvents.map((event, idx) => {
                    const eventDate = new Date(event.date || '');
                    const isDateValid = !isNaN(eventDate.getTime());
                    const dayName = isDateValid ? eventDate.toLocaleDateString('en-AU', { weekday: 'long' }) : 'Flexible';
                    
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

                    const rotateDegs = idx % 2 === 0 ? '-0.5deg' : '0.5deg';

                    return (
                      <div 
                        key={event.id}
                        className="tilted-card sticker-shadow"
                        style={{
                          transform: `rotate(${rotateDegs})`,
                          border: '3px solid var(--text-dark)',
                          borderRadius: '24px',
                          padding: '24px',
                          backgroundColor: 'var(--bg-white)',
                          display: 'flex',
                          flexDirection: 'row',
                          gap: '24px',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          textAlign: 'left'
                        }}
                      >
                        {/* Left Date Block */}
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '74px',
                          height: '74px',
                          borderRadius: '16px',
                          backgroundColor: badgeCol,
                          color: 'var(--text-dark)',
                          border: '2.5px solid var(--text-dark)',
                          flexShrink: 0
                        }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: '900', textTransform: 'uppercase', lineHeight: 1 }}>{dayName.slice(0, 3)}</span>
                          <span style={{ fontSize: '1.5rem', fontWeight: '900', lineHeight: 1, marginTop: '4px' }}>{eventDate.getDate()}</span>
                        </div>

                        {/* Center content block */}
                        <div style={{ flex: '1 1 280px' }}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ 
                              fontSize: '9px', 
                              fontWeight: '900', 
                              textTransform: 'uppercase', 
                              letterSpacing: '0.05em',
                              color: textCol,
                              backgroundColor: badgeCol,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              border: '1.5px solid var(--text-dark)'
                            }}>
                              {event.category || 'General'}
                            </span>
                            <span style={{ 
                              fontSize: '9px', 
                              fontWeight: '900', 
                              textTransform: 'uppercase', 
                              letterSpacing: '0.05em',
                              color: 'white',
                              backgroundColor: 'var(--primary)',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              border: '1.5px solid var(--text-dark)'
                            }}>
                              {event.age_group || 'All Ages'}
                            </span>
                          </div>
                          
                          <h3 style={{ 
                            fontWeight: '900', 
                            fontSize: '1.25rem', 
                            color: 'var(--text-dark)', 
                            margin: '8px 0 4px 0',
                            fontFamily: 'var(--font-display)'
                          }}>
                            {event.title}
                          </h3>

                          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', gap: '12px', flexWrap: 'wrap', margin: '4px 0 12px 0', fontWeight: '600' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={13} /> {event.time || 'Flexible'}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <MapPin size={13} /> {event.location?.split(',')[0]}
                            </span>
                          </p>

                          <p style={{ fontSize: '0.92rem', color: 'var(--text-dark)', lineHeight: '1.5', margin: 0, opacity: 0.9 }}>
                            {event.description}
                          </p>
                        </div>

                        {/* Right Action Link */}
                        <div style={{ flexShrink: 0 }}>
                          <Link 
                            to={`/events/${event.id}`} 
                            style={{ 
                              backgroundColor: 'var(--primary)', 
                              color: 'white', 
                              padding: '10px 20px', 
                              fontSize: '0.8rem',
                              fontWeight: '800',
                              borderRadius: '50px',
                              border: '2.5px solid var(--text-dark)',
                              boxShadow: '3px 3px 0px 0px var(--text-dark)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em'
                            }}
                            className="btn"
                          >
                            Details <ArrowRight size={13} />
                          </Link>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
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
                <button 
                  onClick={() => setShowSuggestModal(true)}
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
                    letterSpacing: '0.05em',
                    cursor: 'pointer'
                  }}
                >
                  Suggest for FREE
                </button>
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
      {/* Event Suggestion Popup Modal */}
      {showSuggestModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(3, 63, 29, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px',
          animation: 'fadeIn 0.25s ease'
        }}>
          <div 
            className="sticker-shadow"
            style={{
              backgroundColor: 'var(--bg-cream)',
              borderRadius: '24px',
              border: '3.5px solid var(--text-dark)',
              width: '100%',
              maxWidth: '650px',
              maxHeight: '90vh',
              overflowY: 'auto',
              position: 'relative',
              padding: '32px',
              boxShadow: '8px 8px 0px 0px var(--text-dark)',
              textAlign: 'left'
            }}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowSuggestModal(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'var(--bg-white)',
                border: '2.5px solid var(--text-dark)',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '2px 2px 0px 0px var(--text-dark)',
                transition: 'var(--transition-smooth)'
              }}
              className="modal-close-btn"
            >
              <X size={18} />
            </button>

            <div style={{ marginBottom: '24px' }}>
              <span style={{ 
                backgroundColor: 'var(--primary-soft)', 
                color: 'var(--primary)', 
                padding: '4px 12px', 
                borderRadius: '6px',
                border: '2px solid var(--text-dark)',
                fontWeight: '800',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'inline-block',
                marginBottom: '8px'
              }}>
                Suggest an Event
              </span>
              <h2 style={{ 
                fontFamily: 'var(--font-display)', 
                fontWeight: 900, 
                fontSize: '1.8rem', 
                color: 'var(--primary)',
                margin: 0
              }}>Suggest a Free Event</h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: '500' }}>
                Know of a free local family activity or community group? Share it with the community!
              </p>
            </div>

            <form onSubmit={handleSuggestSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="modal-grid-cols">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Event Title *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="e.g., Kibble Park Music Circle"
                    style={{ border: '2.5px solid var(--text-dark)', height: '48px', padding: '0 16px' }}
                    value={suggestTitle}
                    onChange={(e) => setSuggestTitle(e.target.value)}
                  />
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Date *</label>
                  <input
                    type="date"
                    required
                    className="form-control"
                    style={{ border: '2.5px solid var(--text-dark)', height: '48px', padding: '0 16px' }}
                    value={suggestDate}
                    onChange={(e) => setSuggestDate(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="modal-grid-cols">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Time / Duration *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="e.g., 10:00 AM - 11:30 AM"
                    style={{ border: '2.5px solid var(--text-dark)', height: '48px', padding: '0 16px' }}
                    value={suggestTime}
                    onChange={(e) => setSuggestTime(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Location Address *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="e.g., Kibble Park, Gosford NSW 2250"
                    style={{ border: '2.5px solid var(--text-dark)', height: '48px', padding: '0 16px' }}
                    value={suggestLocation}
                    onChange={(e) => setSuggestLocation(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="modal-grid-cols">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Category *</label>
                  <select
                    className="form-control"
                    style={{ border: '2.5px solid var(--text-dark)', height: '48px', padding: '0 16px', borderRadius: '50px' }}
                    value={suggestCategory}
                    onChange={(e) => setSuggestCategory(e.target.value)}
                  >
                    <option value="School Holidays">School Holidays</option>
                    <option value="Weekend Activities">Weekend Activities</option>
                    <option value="Weekday Activities">Weekday Activities</option>
                    <option value="Markets">Markets</option>
                    <option value="Playgrounds">Playgrounds</option>
                    <option value="Indoor Activities">Indoor Activities</option>
                    <option value="Playgroups">Playgroups</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Age Suitability *</label>
                  <select
                    className="form-control"
                    style={{ border: '2.5px solid var(--text-dark)', height: '48px', padding: '0 16px', borderRadius: '50px' }}
                    value={suggestAge}
                    onChange={(e) => setSuggestAge(e.target.value)}
                  >
                    <option value="All Ages">All Ages</option>
                    <option value="0-5 years">0-5 years</option>
                    <option value="6-12 years">6-12 years</option>
                    <option value="Teens">Teens</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="modal-grid-cols">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Website / Social Link (Optional)</label>
                  <input
                    type="url"
                    className="form-control"
                    placeholder="https://example.com/event"
                    style={{ border: '2.5px solid var(--text-dark)', height: '48px', padding: '0 16px' }}
                    value={suggestLink}
                    onChange={(e) => setSuggestLink(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Image URL (Optional)</label>
                  <input
                    type="url"
                    className="form-control"
                    placeholder="https://example.com/image.jpg"
                    style={{ border: '2.5px solid var(--text-dark)', height: '48px', padding: '0 16px' }}
                    value={suggestImageUrl}
                    onChange={(e) => setSuggestImageUrl(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Description & Parent Information *</label>
                <textarea
                  required
                  className="form-control"
                  placeholder="Describe the activity. E.g., is there shade, toilets nearby, parking, or fully fenced playgrounds?"
                  style={{ border: '2.5px solid var(--text-dark)', borderRadius: '16px', minHeight: '80px', padding: '12px 16px' }}
                  value={suggestDescription}
                  onChange={(e) => setSuggestDescription(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowSuggestModal(false)}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '50px',
                    border: '2.5px solid var(--text-dark)',
                    backgroundColor: 'var(--bg-white)',
                    color: 'var(--text-dark)',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '12px 28px',
                    borderRadius: '50px',
                    border: '2.5px solid var(--text-dark)',
                    backgroundColor: 'var(--primary)',
                    color: 'white',
                    fontWeight: '800',
                    boxShadow: '3px 3px 0px 0px var(--text-dark)',
                    cursor: 'pointer',
                    opacity: submitting ? 0.7 : 1
                  }}
                >
                  {submitting ? 'Submitting...' : 'Submit Suggestion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
