import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Search, Calendar as CalendarIcon, MapPin, Smile, Award, ArrowRight, Star, Heart } from 'lucide-react';

export default function EventList() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedAge, setSelectedAge] = useState('All');
  const directoryRef = useRef(null);

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

  const scrollToDirectory = () => {
    directoryRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleQuickLinkClick = (category) => {
    setSelectedCategory(category);
    scrollToDirectory();
  };

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

  // Extract events for the bento section
  const mainFeaturedEvent = events.length > 0 ? events[0] : null;
  const secondaryEvent1 = events.length > 1 ? events[1] : null;
  const secondaryEvent2 = events.length > 2 ? events[2] : null;

  return (
    <div style={{ backgroundColor: 'var(--bg-cream)', minHeight: '100vh' }}>
      
      {/* 1. Hero Section (Stitch coastal background) */}
      <section style={{ 
        position: 'relative', 
        height: '80vh', 
        overflow: 'hidden', 
        display: 'flex', 
        alignItems: 'center',
        textAlign: 'left'
      }} className="hero-section">
        {/* Background Image & Overlay */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <img 
            src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80" 
            alt="Beach background" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
          <div style={{ 
            position: 'absolute', 
            inset: 0, 
            background: 'linear-gradient(90deg, rgba(3, 63, 29, 0.75) 0%, rgba(3, 63, 29, 0.25) 100%)' 
          }} />
        </div>

        {/* Hero Content */}
        <div style={{ 
          position: 'relative', 
          zIndex: 1, 
          padding: '0 48px', 
          maxWidth: '1280px', 
          margin: '0 auto', 
          width: '100%' 
        }} className="hero-container">
          <div style={{ maxWidth: '650px', color: 'white' }}>
            
            {/* Floating Tag */}
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              backgroundColor: 'var(--yellow-soft)', 
              color: 'var(--teal)', 
              padding: '6px 18px', 
              borderRadius: '50px', 
              marginBottom: '24px',
              border: '2.5px solid var(--text-dark)',
              transform: 'rotate(-2deg)',
              boxShadow: '3px 3px 0px 0px var(--text-dark)',
              fontWeight: '800',
              fontSize: '0.85rem'
            }} className="floating-sticker">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              100% FREE FAMILY FUN
            </div>

            {/* Sora Geometric Display Header */}
            <h1 style={{ 
              fontFamily: 'var(--font-display)',
              fontSize: '3.8rem', 
              fontWeight: '900',
              lineHeight: '1.05',
              marginBottom: '24px', 
              letterSpacing: '-0.02em'
            }}>
              Discover <span style={{ color: 'var(--primary-soft)' }}>Delightful</span> Free Activities for Kids
            </h1>

            {/* Approaches Body Text */}
            <p style={{ 
              fontFamily: 'var(--font-sans)',
              fontSize: '1.2rem', 
              marginBottom: '32px', 
              opacity: 0.95,
              lineHeight: '1.7'
            }}>
              No paid ads, no hidden costs. Just centralized free events, activities, and playground reviews to keep your little locals happy.
            </p>

            <button 
              onClick={scrollToDirectory}
              style={{ 
                backgroundColor: 'var(--primary)', 
                color: 'white', 
                padding: '16px 36px', 
                borderRadius: '16px', 
                fontWeight: '800', 
                fontSize: '1.05rem',
                border: '3.5px solid var(--text-dark)',
                boxShadow: '4px 4px 0px 0px var(--text-dark)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'var(--transition-bouncy)'
              }}
              className="explore-btn"
            >
              Explore Directory
              <ArrowRight size={20} />
            </button>

          </div>
        </div>
      </section>

      {/* 2. Quick Links Directory Bento Section */}
      <section style={{ 
        padding: '80px 24px', 
        maxWidth: '1280px', 
        margin: '0 auto' 
      }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '28px' 
        }}>
          {/* Card 1: Playgrounds */}
          <div 
            onClick={() => handleQuickLinkClick('Playground')}
            style={{ 
              backgroundColor: 'var(--secondary-soft)', 
              padding: '40px 32px', 
              borderRadius: '24px', 
              border: '3.5px solid var(--text-dark)',
              boxShadow: '6px 6px 0px 0px var(--text-dark)',
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'transform 0.3s ease'
            }}
            className="quick-link-card link-playgrounds"
          >
            <div style={{ 
              width: '80px', 
              height: '80px', 
              backgroundColor: 'var(--secondary)', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              marginBottom: '24px',
              border: '2.5px solid var(--text-dark)',
              color: 'white'
            }} className="icon-container">
              <span className="material-symbols-outlined text-[36px]" style={{ fontVariationSettings: "'FILL' 0" }}>park</span>
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '1.5rem', color: 'var(--primary)', marginBottom: '8px' }}>Playgrounds</h3>
            <p style={{ color: 'var(--primary)', opacity: 0.8, fontSize: '0.95rem', fontWeight: '600' }}>The best fenced and fun spots on the coast.</p>
          </div>

          {/* Card 2: Libraries */}
          <div 
            onClick={() => handleQuickLinkClick('Library')}
            style={{ 
              backgroundColor: 'var(--yellow-soft)', 
              padding: '40px 32px', 
              borderRadius: '24px', 
              border: '3.5px solid var(--text-dark)',
              boxShadow: '6px 6px 0px 0px var(--text-dark)',
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'transform 0.3s ease'
            }}
            className="quick-link-card link-libraries"
          >
            <div style={{ 
              width: '80px', 
              height: '80px', 
              backgroundColor: 'var(--yellow)', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              marginBottom: '24px',
              border: '2.5px solid var(--text-dark)',
              color: 'white'
            }} className="icon-container">
              <span className="material-symbols-outlined text-[36px]" style={{ fontVariationSettings: "'FILL' 0" }}>auto_stories</span>
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '1.5rem', color: 'var(--primary)', marginBottom: '8px' }}>Libraries</h3>
            <p style={{ color: 'var(--primary)', opacity: 0.8, fontSize: '0.95rem', fontWeight: '600' }}>Storytime, craft, and quiet reading nooks.</p>
          </div>

          {/* Card 3: Art & Craft */}
          <div 
            onClick={() => handleQuickLinkClick('Art & Craft')}
            style={{ 
              backgroundColor: 'var(--primary-soft)', 
              padding: '40px 32px', 
              borderRadius: '24px', 
              border: '3.5px solid var(--text-dark)',
              boxShadow: '6px 6px 0px 0px var(--text-dark)',
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'transform 0.3s ease'
            }}
            className="quick-link-card link-arts"
          >
            <div style={{ 
              width: '80px', 
              height: '80px', 
              backgroundColor: 'var(--primary)', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              marginBottom: '24px',
              border: '2.5px solid var(--text-dark)',
              color: 'white'
            }} className="icon-container">
              <span className="material-symbols-outlined text-[36px]" style={{ fontVariationSettings: "'FILL' 0" }}>palette</span>
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '1.5rem', color: 'var(--primary)', marginBottom: '8px' }}>Art Classes</h3>
            <p style={{ color: 'var(--primary)', opacity: 0.8, fontSize: '0.95rem', fontWeight: '600' }}>Creative workshops for every age group.</p>
          </div>
        </div>
      </section>

      {/* 3. Featured Events (Bento Grid) */}
      <section style={{ 
        padding: '80px 24px', 
        backgroundColor: 'var(--bg-cream)',
        borderTop: '2px dashed var(--border-soft)',
        borderBottom: '2px dashed var(--border-soft)'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          
          {/* Section Header */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-end', 
            marginBottom: '48px',
            textAlign: 'left'
          }}>
            <div>
              <div style={{ 
                color: 'var(--secondary)', 
                fontWeight: '800', 
                fontSize: '0.85rem', 
                textTransform: 'uppercase', 
                letterSpacing: '0.15em',
                marginBottom: '8px'
              }}>What's Happening</div>
              <h2 style={{ 
                fontFamily: 'var(--font-display)',
                fontWeight: 900, 
                fontSize: '2.4rem', 
                color: 'var(--primary)',
                margin: 0
              }}>Featured Events</h2>
            </div>
            <Link 
              to="/calendar" 
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '8px', 
                color: 'var(--primary)', 
                fontWeight: '800', 
                fontSize: '0.95rem',
                padding: '10px 24px',
                border: '3px solid var(--text-dark)',
                borderRadius: '50px',
                backgroundColor: 'var(--bg-white)',
                boxShadow: '3px 3px 0px 0px var(--text-dark)',
                transition: 'var(--transition-bouncy)'
              }}
              className="featured-cal-btn"
            >
              View Calendar Grid
              <span className="material-symbols-outlined">calendar_month</span>
            </Link>
          </div>

          {/* Bento Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr',
            gap: '36px'
          }} className="md:grid-cols-12">
            
            {/* Left Bento: Main Large Featured Card */}
            {mainFeaturedEvent ? (
              <div 
                style={{ 
                  gridColumn: 'span 7',
                  backgroundColor: 'var(--bg-white)',
                  padding: '24px',
                  borderRadius: '32px',
                  border: '3.5px solid var(--text-dark)',
                  boxShadow: '8px 8px 0px 0px var(--primary)',
                  position: 'relative',
                  transform: 'rotate(-1deg)',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%'
                }}
                className="featured-large-bento"
              >
                {/* Floating FREE badge */}
                <div style={{ 
                  position: 'absolute', 
                  top: '-20px', 
                  right: '-10px', 
                  width: '90px', 
                  height: '90px', 
                  backgroundColor: 'var(--yellow)', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: 'white', 
                  fontWeight: '900', 
                  fontSize: '1.25rem',
                  border: '4px solid var(--text-dark)',
                  boxShadow: '3px 3px 0px 0px var(--text-dark)',
                  transform: 'rotate(12deg)',
                  zIndex: 10
                }} className="floating-sticker-alt">
                  FREE
                </div>

                <div style={{ 
                  position: 'relative', 
                  borderRadius: '20px', 
                  overflow: 'hidden', 
                  aspectRatio: '16/9',
                  marginBottom: '24px',
                  border: '2.5px solid var(--text-dark)'
                }}>
                  <img 
                    src={mainFeaturedEvent.image_url || 'https://images.unsplash.com/photo-1596464716127-f2a82984de30?auto=format&fit=crop&w=800&q=80'} 
                    alt={mainFeaturedEvent.title} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                  <div style={{ 
                    position: 'absolute', 
                    bottom: '16px', 
                    left: '16px', 
                    backgroundColor: 'var(--primary)', 
                    color: 'white', 
                    padding: '6px 14px', 
                    borderRadius: '50px', 
                    fontWeight: '800', 
                    fontSize: '0.8rem',
                    border: '1.5px solid var(--text-dark)'
                  }}>
                    {mainFeaturedEvent.category || 'Adventure'}
                  </div>
                </div>

                <h3 style={{ 
                  fontFamily: 'var(--font-display)', 
                  fontWeight: '900', 
                  fontSize: '2.2rem', 
                  color: 'var(--primary)', 
                  marginBottom: '12px',
                  lineHeight: '1.15',
                  letterSpacing: '-0.01em'
                }}>{mainFeaturedEvent.title}</h3>

                <div style={{ display: 'flex', gap: '16px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '700', marginBottom: '16px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CalendarIcon size={16} style={{ color: 'var(--secondary)' }} /> {mainFeaturedEvent.date && !isNaN(new Date(mainFeaturedEvent.date).getTime()) ? new Date(mainFeaturedEvent.date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Flexible'}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Award size={16} style={{ color: 'var(--secondary)' }} /> {mainFeaturedEvent.age_group || 'All Ages'}
                  </span>
                </div>

                <p style={{ color: 'var(--text-dark)', fontSize: '1rem', lineHeight: '1.6', marginBottom: '24px', flexGrow: 1 }}>
                  {mainFeaturedEvent.description}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontWeight: '800', fontSize: '0.95rem' }}>
                    <MapPin size={18} style={{ color: 'var(--secondary)' }} />
                    {mainFeaturedEvent.location?.split(',')[0]}
                  </div>
                  <Link 
                    to={`/events/${mainFeaturedEvent.id}`}
                    style={{ 
                      width: '48px', 
                      height: '48px', 
                      borderRadius: '50%', 
                      backgroundColor: 'var(--secondary)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: 'white',
                      border: '3px solid var(--text-dark)',
                      boxShadow: '3px 3px 0px 0px var(--text-dark)',
                      transition: 'var(--transition-bouncy)'
                    }}
                    className="bento-arrow-btn"
                  >
                    <ArrowRight size={20} />
                  </Link>
                </div>
              </div>
            ) : (
              <div style={{ gridColumn: 'span 7', padding: '60px', backgroundColor: 'var(--bg-white)', borderRadius: '24px', border: '3.5px dashed var(--text-dark)', height: '100%' }}>
                <Smile size={48} style={{ color: 'var(--secondary)' }} />
                <h4 style={{ fontWeight: '800', marginTop: '16px' }}>No events scheduled yet!</h4>
              </div>
            )}

            {/* Right Bento: Secondary List Column */}
            <div style={{ 
              gridColumn: 'span 5',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              justifyContent: 'space-between'
            }} className="bento-right-column">
              
              {/* Secondary Event 1 */}
              {secondaryEvent1 ? (
                <Link 
                  to={`/events/${secondaryEvent1.id}`}
                  style={{ 
                    backgroundColor: 'var(--bg-white)',
                    padding: '24px',
                    borderRadius: '24px',
                    border: '3.5px solid var(--text-dark)',
                    boxShadow: '6px 6px 0px 0px var(--text-dark)',
                    display: 'flex',
                    gap: '20px',
                    alignItems: 'center',
                    transform: 'rotate(1deg)',
                    transition: 'var(--transition-bouncy)',
                    textAlign: 'left'
                  }}
                  className="bento-secondary-card"
                >
                  <div style={{ 
                    width: '120px', 
                    height: '120px', 
                    borderRadius: '16px', 
                    overflow: 'hidden', 
                    flexShrink: 0,
                    border: '2px solid var(--text-dark)'
                  }}>
                    <img 
                      src={secondaryEvent1.image_url || 'https://images.unsplash.com/photo-1502082553048-f2a82984de30?auto=format&fit=crop&w=150&q=80'} 
                      alt="" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  </div>
                  <div style={{ flexGrow: 1 }}>
                    <span style={{ 
                      backgroundColor: 'var(--primary-soft)', 
                      color: 'var(--primary)', 
                      padding: '2px 10px', 
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: '800',
                      border: '1.5px solid var(--text-dark)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      display: 'inline-block',
                      marginBottom: '8px'
                    }}>
                      {secondaryEvent1.category || 'General'}
                    </span>
                    <h4 style={{ 
                      fontFamily: 'var(--font-display)', 
                      fontWeight: '900', 
                      fontSize: '1.25rem', 
                      color: 'var(--primary)',
                      margin: 0,
                      lineHeight: '1.2'
                    }}>{secondaryEvent1.title}</h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '700', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CalendarIcon size={12} /> {secondaryEvent1.date && !isNaN(new Date(secondaryEvent1.date).getTime()) ? new Date(secondaryEvent1.date).toLocaleDateString('en-AU') : 'Flexible'}
                    </p>
                  </div>
                </Link>
              ) : (
                <div style={{ padding: '24px', backgroundColor: 'var(--bg-white)', borderRadius: '24px', border: '3.5px dashed var(--text-dark)', flexGrow: 1 }}>
                  <p style={{ color: 'var(--text-muted)', fontWeight: '700' }}>Stay tuned for toddler events!</p>
                </div>
              )}

              {/* Secondary Event 2 */}
              {secondaryEvent2 ? (
                <Link 
                  to={`/events/${secondaryEvent2.id}`}
                  style={{ 
                    backgroundColor: 'var(--bg-white)',
                    padding: '24px',
                    borderRadius: '24px',
                    border: '3.5px solid var(--text-dark)',
                    boxShadow: '6px 6px 0px 0px var(--text-dark)',
                    display: 'flex',
                    gap: '20px',
                    alignItems: 'center',
                    transform: 'rotate(-1deg)',
                    transition: 'var(--transition-bouncy)',
                    textAlign: 'left'
                  }}
                  className="bento-secondary-card"
                >
                  <div style={{ 
                    width: '120px', 
                    height: '120px', 
                    borderRadius: '16px', 
                    overflow: 'hidden', 
                    flexShrink: 0,
                    border: '2px solid var(--text-dark)'
                  }}>
                    <img 
                      src={secondaryEvent2.image_url || 'https://images.unsplash.com/photo-1596464716127-f2a82984de30?auto=format&fit=crop&w=150&q=80'} 
                      alt="" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  </div>
                  <div style={{ flexGrow: 1 }}>
                    <span style={{ 
                      backgroundColor: 'var(--yellow-soft)', 
                      color: 'var(--teal)', 
                      padding: '2px 10px', 
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: '800',
                      border: '1.5px solid var(--text-dark)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      display: 'inline-block',
                      marginBottom: '8px'
                    }}>
                      {secondaryEvent2.category || 'General'}
                    </span>
                    <h4 style={{ 
                      fontFamily: 'var(--font-display)', 
                      fontWeight: '900', 
                      fontSize: '1.25rem', 
                      color: 'var(--primary)',
                      margin: 0,
                      lineHeight: '1.2'
                    }}>{secondaryEvent2.title}</h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '700', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CalendarIcon size={12} /> {secondaryEvent2.date && !isNaN(new Date(secondaryEvent2.date).getTime()) ? new Date(secondaryEvent2.date).toLocaleDateString('en-AU') : 'Flexible'}
                    </p>
                  </div>
                </Link>
              ) : (
                <div style={{ padding: '24px', backgroundColor: 'var(--bg-white)', borderRadius: '24px', border: '3.5px dashed var(--text-dark)', flexGrow: 1 }}>
                  <p style={{ color: 'var(--text-muted)', fontWeight: '700' }}>Stay tuned for library events!</p>
                </div>
              )}

            </div>

          </div>
        </div>
      </section>

      {/* 4. Active Directory Filter & Interactive Grid */}
      <section 
        ref={directoryRef} 
        style={{ 
          padding: '80px 24px', 
          maxWidth: '1280px', 
          margin: '0 auto' 
        }}
      >
        <div style={{ textAlign: 'left', marginBottom: '32px' }}>
          <h2 style={{ 
            fontFamily: 'var(--font-display)', 
            fontWeight: 900, 
            fontSize: '2.2rem', 
            color: 'var(--primary)',
            margin: 0
          }}>Explore Local Directory</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '4px', fontWeight: '600' }}>
            Filter by age or type to discover hidden rockpools, libraries, fenced playgrounds, and creative spots.
          </p>
        </div>

        {/* Search & Filters block */}
        <div style={{ 
          backgroundColor: 'var(--bg-white)', 
          borderRadius: '24px', 
          padding: '32px', 
          border: '3.5px solid var(--text-dark)', 
          boxShadow: '6px 6px 0px 0px var(--text-dark)',
          marginBottom: '56px'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={20} />
              <input 
                type="text" 
                placeholder="Search playgrounds, libraries, parks..." 
                className="form-control"
                style={{ 
                  paddingLeft: '48px',
                  border: '3px solid var(--text-dark)',
                  height: '52px',
                  borderRadius: '50px',
                  backgroundColor: 'var(--bg-cream)',
                  fontSize: '0.95rem'
                }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Age selector */}
            <div style={{ position: 'relative' }}>
              <select 
                className="form-control" 
                style={{ 
                  appearance: 'none',
                  border: '3px solid var(--text-dark)',
                  height: '52px',
                  borderRadius: '50px',
                  backgroundColor: 'var(--bg-cream)',
                  fontSize: '0.95rem',
                  fontWeight: '700',
                  color: 'var(--text-dark)',
                  paddingLeft: '20px'
                }}
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

          {/* Categories select */}
          <div style={{ textAlign: 'left' }}>
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
                    style={{ 
                      padding: '10px 24px', 
                      fontSize: '0.85rem',
                      fontWeight: '800',
                      borderRadius: '50px',
                      border: '3px solid var(--text-dark)',
                      cursor: 'pointer',
                      transition: 'var(--transition-bouncy)',
                      backgroundColor: isActive ? 'var(--primary)' : 'var(--bg-white)',
                      color: isActive ? 'var(--bg-white)' : 'var(--text-dark)',
                      boxShadow: isActive ? '3px 3px 0px 0px var(--text-dark)' : 'none',
                      transform: isActive ? 'translateY(-2px)' : 'none',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                    className="category-chip"
                  >
                    {cat === 'All' ? 'All Activities' : cat}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Directory Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ 
              width: '50px', 
              height: '50px', 
              border: '5px solid var(--primary-soft)', 
              borderTopColor: 'var(--primary)', 
              borderRadius: '50%', 
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px'
            }} />
            <p style={{ fontWeight: '800', color: 'var(--primary)' }}>Loading awesome events...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '80px 24px', 
            backgroundColor: 'var(--bg-white)', 
            borderRadius: '24px', 
            border: '3px dashed var(--text-dark)',
            boxShadow: '6px 6px 0px 0px var(--text-dark)',
            animation: 'slideUp 0.4s ease'
          }}>
            <Smile size={64} style={{ color: 'var(--secondary)', marginBottom: '20px' }} />
            <h3 style={{ fontWeight: 950, fontSize: '1.6rem', color: 'var(--primary)' }}>No free activities found</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '32px', maxWidth: '450px', margin: '0 auto', fontSize: '1.05rem', lineHeight: '1.6' }}>
              We couldn't find any activities matching your filters. Know of a free local kids event? Let us know in the portal and we'll add it!
            </p>
            <button 
              style={{ 
                padding: '12px 28px', 
                borderRadius: '50px', 
                border: '3px solid var(--text-dark)', 
                backgroundColor: 'var(--secondary)', 
                color: 'white',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: '3px 3px 0px 0px var(--text-dark)'
              }} 
              onClick={() => { setSearchTerm(''); setSelectedCategory('All'); setSelectedAge('All'); }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div>
            <h3 style={{ 
              fontFamily: 'var(--font-display)', 
              fontSize: '1.6rem', 
              fontWeight: '900', 
              color: 'var(--primary)', 
              textAlign: 'left',
              marginBottom: '32px',
              textTransform: 'uppercase',
              letterSpacing: '0.02em'
            }}>
              Directory Listings ({filteredEvents.length})
            </h3>

            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
              gap: '36px'
            }}>
              {filteredEvents.map((event, index) => {
                // Alternating aesthetic rotations
                const tiltClass = index % 3 === 0 ? 'tilt-left' : index % 3 === 1 ? 'tilt-right' : '';
                const tiltStyle = index % 3 === 0 ? { transform: 'rotate(-1.5deg)' } : index % 3 === 1 ? { transform: 'rotate(1.5deg)' } : {};

                return (
                  <article 
                    key={event.id}
                    style={{
                      backgroundColor: 'var(--bg-white)',
                      borderRadius: '20px',
                      border: '3px solid var(--text-dark)',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%',
                      boxShadow: '6px 6px 0px 0px var(--text-dark)',
                      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                      padding: '8px',
                      ...tiltStyle
                    }}
                    className={`sticker-card ${tiltClass}`}
                  >
                    <div style={{ 
                      position: 'relative', 
                      borderRadius: '14px', 
                      height: '210px', 
                      width: '100%', 
                      overflow: 'hidden',
                      border: '2.5px solid var(--text-dark)'
                    }}>
                      <span style={{ 
                        position: 'absolute', 
                        top: '12px', 
                        left: '12px', 
                        backgroundColor: 'var(--secondary)', 
                        color: 'white', 
                        padding: '4px 12px', 
                        borderRadius: '50px', 
                        fontSize: '0.75rem', 
                        fontWeight: '900',
                        border: '1.5px solid var(--text-dark)',
                        zIndex: 10
                      }}>FREE</span>
                      
                      <img 
                        src={event.image_url || 'https://images.unsplash.com/photo-1596464716127-f2a82984de30?auto=format&fit=crop&w=600&q=80'} 
                        alt={event.title} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                      
                      <div style={{ 
                        position: 'absolute', 
                        bottom: '0', 
                        left: '0', 
                        right: '0', 
                        background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
                        padding: '24px 16px 12px',
                        color: 'white',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.8rem',
                        fontWeight: '700'
                      }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CalendarIcon size={12} /> {event.date && !isNaN(new Date(event.date).getTime()) ? new Date(event.date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Flexible'}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Award size={12} /> {event.age_group || 'All Ages'}
                        </span>
                      </div>
                    </div>
                    
                    <div style={{ 
                      padding: '20px 16px 16px 16px', 
                      display: 'flex',
                      flexDirection: 'column',
                      flexGrow: 1,
                      gap: '12px',
                      textAlign: 'left'
                    }}>
                      <span style={{ 
                        backgroundColor: 'var(--primary-soft)', 
                        color: 'var(--primary)', 
                        padding: '4px 12px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: '800',
                        border: '2px solid var(--text-dark)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        alignSelf: 'flex-start'
                      }}>
                        {event.category || 'General'}
                      </span>
                      
                      <h3 style={{ 
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.35rem',
                        fontWeight: '900',
                        color: 'var(--primary)',
                        lineHeight: '1.25',
                        margin: 0
                      }}>
                        {event.title}
                      </h3>
                      
                      <p style={{ 
                        fontFamily: 'var(--font-sans)',
                        fontSize: '0.92rem', 
                        color: 'var(--text-muted)',
                        lineHeight: '1.6',
                        margin: 0,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flexGrow: 1
                      }}>
                        {event.description}
                      </p>
                      
                      <div style={{ 
                        marginTop: 'auto', 
                        paddingTop: '16px',
                        borderTop: '2px solid var(--border-soft)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '700' }}>
                          <MapPin size={14} style={{ color: 'var(--primary)' }} />
                          <span>{event.location?.split(',')[0]}</span>
                        </div>
                        <Link 
                          to={`/events/${event.id}`} 
                          style={{ 
                            width: '40px', 
                            height: '40px', 
                            borderRadius: '50%', 
                            backgroundColor: 'var(--secondary-soft)',
                            border: '2px solid var(--text-dark)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--secondary)',
                            transition: 'var(--transition-bouncy)',
                            cursor: 'pointer'
                          }}
                          className="directory-arrow-btn"
                        >
                          <ArrowRight size={18} />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* 5. Newsletter / Community Section */}
      <section style={{ 
        padding: '80px 24px', 
        maxWidth: '1280px', 
        margin: '0 auto',
        animation: 'slideUp 0.6s ease'
      }}>
        <div 
          className="sticker-shadow"
          style={{ 
            backgroundColor: 'var(--primary)', 
            color: 'white', 
            borderRadius: '40px', 
            padding: '64px 32px', 
            position: 'relative', 
            overflow: 'hidden',
            border: '3.5px solid var(--text-dark)',
            boxShadow: '8px 8px 0px 0px var(--text-dark)'
          }}
        >
          {/* Absolute floating celebration detail */}
          <div style={{ 
            position: 'absolute', 
            top: '40px', 
            right: '40px', 
            opacity: 0.25,
            pointerEvents: 'none'
          }} className="floating-sticker-alt">
            <span className="material-symbols-outlined text-[100px]">celebration</span>
          </div>

          <div style={{ position: 'relative', zIndex: 10, maxWidth: '650px', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ 
              fontFamily: 'var(--font-display)',
              fontWeight: 800, 
              fontSize: '2.5rem', 
              marginBottom: '20px', 
              color: 'white',
              lineHeight: 1.15
            }}>Never miss a free event again.</h2>
            
            <p style={{ 
              fontFamily: 'var(--font-sans)',
              fontSize: '1.1rem', 
              marginBottom: '40px', 
              opacity: 0.9,
              lineHeight: 1.6
            }}>
              Join 2,500+ Central Coast families getting weekly updates on the best free things to do with their kids.
            </p>
            
            <form 
              onSubmit={(e) => { e.preventDefault(); alert("Thanks for subscribing to the weekly scoop!"); }}
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '16px', 
                maxWidth: '450px', 
                margin: '0 auto' 
              }}
              className="md:flex-row"
            >
              <input 
                type="email" 
                placeholder="Your email address" 
                required
                style={{ 
                  flexGrow: 1, 
                  padding: '16px 24px', 
                  borderRadius: '16px', 
                  backgroundColor: 'rgba(255, 255, 255, 0.15)', 
                  border: '2.5px solid rgba(255, 255, 255, 0.3)', 
                  color: 'white',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                className="newsletter-input"
              />
              <button 
                type="submit"
                style={{ 
                  backgroundColor: 'var(--secondary)', 
                  color: 'white', 
                  padding: '16px 36px', 
                  borderRadius: '16px', 
                  fontWeight: '800', 
                  fontSize: '1rem',
                  border: '3px solid var(--text-dark)',
                  boxShadow: '3px 3px 0px 0px var(--text-dark)',
                  cursor: 'pointer',
                  transition: 'var(--transition-bouncy)'
                }}
                className="newsletter-btn"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Styled inline components */}
      <style>{`
        .sticker-card {
          transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.25s ease !important;
        }
        .sticker-card:hover {
          transform: translate(-4px, -4px) rotate(0deg) scale(1.02) !important;
          box-shadow: 10px 10px 0px 0px var(--text-dark) !important;
        }
        .quick-link-card {
          transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.25s ease !important;
        }
        .quick-link-card:hover {
          transform: translate(-3px, -3px) scale(1.03) !important;
          box-shadow: 10px 10px 0px 0px var(--text-dark) !important;
        }
        .quick-link-card:hover .icon-container {
          transform: scale(1.1);
        }
        .featured-large-bento {
          transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.25s ease !important;
        }
        .featured-large-bento:hover {
          transform: translate(-4px, -4px) rotate(0deg) scale(1.01) !important;
          box-shadow: 12px 12px 0px 0px var(--primary) !important;
        }
        .bento-secondary-card:hover {
          transform: translate(-4px, -4px) rotate(0deg) scale(1.02) !important;
          box-shadow: 10px 10px 0px 0px var(--text-dark) !important;
        }
        .explore-btn:hover, .featured-cal-btn:hover, .newsletter-btn:hover {
          transform: translate(-3px, -3px) !important;
          box-shadow: 6px 6px 0px 0px var(--text-dark) !important;
        }
        .category-chip:hover {
          transform: translateY(-3px);
          box-shadow: 4px 4px 0px 0px var(--text-dark) !important;
        }
        .bento-arrow-btn:hover, .directory-arrow-btn:hover {
          background-color: var(--primary) !important;
          color: white !important;
          transform: scale(1.1) rotate(15deg);
        }
        .newsletter-input:focus {
          border-color: white !important;
        }
        @keyframes float {
          0% { transform: translateY(0px) rotate(-2deg); }
          50% { transform: translateY(-8px) rotate(0deg); }
          100% { transform: translateY(0px) rotate(-2deg); }
        }
        @keyframes float-alt {
          0% { transform: translateY(0px) rotate(12deg); }
          50% { transform: translateY(-8px) rotate(14deg); }
          100% { transform: translateY(0px) rotate(12deg); }
        }
        .floating-sticker {
          animation: float 4s ease-in-out infinite !important;
        }
        .floating-sticker-alt {
          animation: float-alt 5s ease-in-out infinite !important;
        }
        @media (max-width: 768px) {
          .hero-section {
            height: auto !important;
            padding: 120px 20px 60px 20px !important;
          }
          h1 {
            font-size: 2.2rem !important;
          }
          .md\:grid-cols-12 {
            grid-template-columns: 1fr !important;
          }
          .bento-right-column {
            gap: 20px !important;
          }
          .newsletter-input {
            width: 100% !important;
          }
        }
      `}</style>

    </div>
  );
}

