import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Calendar as CalendarIcon, MapPin, Smile, Award, Clock, ArrowLeft, Share2, ClipboardCheck, Globe } from 'lucide-react';
import { trackEventClick } from '../analytics';

export default function EventDetail() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const handleShareCopy = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAdmin(!!user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function fetchEvent() {
      try {
        const docRef = doc(db, 'events', id);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          setEvent({ id: snapshot.id, ...snapshot.data() });
          // Track this click event
          trackEventClick(id);
        }
      } catch (error) {
        console.error("Error fetching event details:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchEvent();
  }, [id]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <div style={{ 
          width: '50px', 
          height: '50px', 
          border: '5px solid var(--border-soft)', 
          borderTopColor: 'var(--primary)', 
          borderRadius: '50%', 
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px'
        }} />
        <p style={{ fontWeight: '700', color: 'var(--text-muted)' }}>Loading activity details...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!event) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px' }}>
        <Smile size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
        <h3 style={{ fontWeight: 800, marginBottom: '8px' }}>Activity not found</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>The event might have been completed or removed.</p>
        <Link to="/" className="btn btn-primary">Back to Home</Link>
      </div>
    );
  }

  // Generate Facebook share text
  const getFormattedFacebookPost = () => {
    const dateFormatted = event.date && !isNaN(new Date(event.date).getTime())
      ? new Date(event.date).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : 'Flexible Date';
    
    return `🎒 FREE CENTRAL COAST KIDS ACTIVITY! 🎒

Discover: ${event.title}

📅 Date: ${dateFormatted}
⏰ Time: ${event.time || 'Flexible / Check listing'}
📍 Location: ${event.location}
👶 Age Suitability: ${event.age_group || 'All Ages'}

${event.description || ''}

✨ Find more 100% free family events and reviews at: https://littlelocals.au/events/${event.id}`;
  };

  const handleCopyToClipboard = () => {
    const postText = getFormattedFacebookPost();
    navigator.clipboard.writeText(postText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  return (
    <div className="detail-page-container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Back Navigation */}
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '24px' }}>
        <ArrowLeft size={16} /> Back to Directory
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
        
        {/* Main Details Panel */}
        <div className="detail-card" style={{ 
          backgroundColor: 'var(--bg-white)', 
          borderRadius: 'var(--radius-lg)', 
          border: '1px solid var(--border-soft)',
          boxShadow: 'var(--shadow-light)'
        }}>
          {/* Cover image */}
          <div className="detail-cover-image">
            <img 
              src={event.image_url || 'https://images.unsplash.com/photo-1596464716127-f2a82984de30?auto=format&fit=crop&w=1000&q=80'} 
              alt={event.title} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
            <div style={{ position: 'absolute', top: '20px', left: '20px', backgroundColor: 'var(--secondary)', color: 'white', padding: '8px 20px', borderRadius: '50px', fontWeight: '900', fontSize: '0.9rem', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
              100% FREE
            </div>
          </div>

          <div className="detail-card-content">
            
            {/* Header info */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <span className="badge badge-coral">{event.category || 'General'}</span>
              <span className="badge badge-blue">{event.age_group || 'All Ages'}</span>
            </div>
            
            <h1 style={{ fontWeight: 900, fontSize: 'clamp(1.6rem, 5vw, 2.2rem)', marginBottom: '24px', textAlign: 'left', lineHeight: 1.25 }}>
              {event.title}
            </h1>

            {/* Quick Metrics Bar */}
            <div className="detail-metrics-bar">
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                  <CalendarIcon size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Date</div>
                  <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>
                    {event.date && !isNaN(new Date(event.date).getTime()) ? new Date(event.date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) : 'Flexible'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--secondary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--secondary)' }}>
                  <Clock size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Time</div>
                  <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{event.time || 'Flexible / Check link'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', minWidth: 0 }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--teal-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--teal)', flexShrink: 0 }}>
                  <MapPin size={20} />
                </div>
                <div style={{ minWidth: 0, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Location</div>
                  <div style={{ fontWeight: '700', fontSize: '0.95rem', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{event.location}</div>
                </div>
              </div>
            </div>

            {/* Event Description */}
            <div style={{ textAlign: 'left', marginBottom: '40px' }}>
              <h3 style={{ fontWeight: 800, marginBottom: '12px', fontSize: '1.3rem' }}>About this Activity</h3>
              <div className="detail-body-text" style={{ fontSize: '1.05rem', color: 'var(--text-dark)', lineHeight: '1.7' }}>
                {event.description?.split('\n').map((para, i) => {
                  if (!para.trim()) return <div key={i} style={{ height: '12px' }} />;
                  return (
                    <p key={i} style={{ marginBottom: '16px' }}>
                      {para}
                    </p>
                  );
                })}
              </div>
            </div>

            {/* Public Sharing Row */}
            <div style={{ 
              marginTop: '40px', 
              paddingTop: '32px', 
              borderTop: '2px dashed var(--border-soft)',
              textAlign: 'left'
            }}>
              <h4 style={{ 
                fontFamily: 'var(--font-display)', 
                fontWeight: 900, 
                fontSize: '1.15rem', 
                color: 'var(--primary)', 
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Share2 size={18} /> Share this activity with other parents!
              </h4>
              
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <a 
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="share-btn-hover"
                  style={{ 
                    padding: '10px 18px', 
                    fontSize: '0.85rem',
                    fontWeight: '800',
                    backgroundColor: '#1877f2',
                    color: 'white',
                    border: '2.5px solid var(--text-dark)',
                    borderRadius: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    boxShadow: '3px 3px 0px 0px var(--text-dark)',
                    textDecoration: 'none'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  Facebook
                </a>

                <a 
                  href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent("Check out this great kids activity: " + event.title)}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="share-btn-hover"
                  style={{ 
                    padding: '10px 18px', 
                    fontSize: '0.85rem',
                    fontWeight: '800',
                    backgroundColor: 'var(--text-dark)',
                    color: 'white',
                    border: '2.5px solid var(--text-dark)',
                    borderRadius: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    boxShadow: '3px 3px 0px 0px var(--text-dark)',
                    textDecoration: 'none'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  Twitter / X
                </a>

                <a 
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent("Check out this great kids activity: " + event.title + " - " + window.location.href)}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="share-btn-hover"
                  style={{ 
                    padding: '10px 18px', 
                    fontSize: '0.85rem',
                    fontWeight: '800',
                    backgroundColor: '#25d366',
                    color: 'white',
                    border: '2.5px solid var(--text-dark)',
                    borderRadius: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    boxShadow: '3px 3px 0px 0px var(--text-dark)',
                    textDecoration: 'none'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.725 1.45 5.535 0 10.04-4.502 10.04-10.042.002-2.684-1.038-5.207-2.93-7.1-1.892-1.892-4.41-2.934-7.098-2.936-5.54 0-10.045 4.504-10.047 10.045-.001 1.73.46 3.419 1.336 4.93L1.082 22.91l6.023-1.58c1.554.847 3.125 1.293 4.566 1.293z"/></svg>
                  WhatsApp
                </a>

                <button 
                  onClick={handleShareCopy}
                  className="share-btn-hover"
                  style={{ 
                    padding: '10px 18px', 
                    fontSize: '0.85rem',
                    fontWeight: '800',
                    backgroundColor: 'var(--yellow-soft)',
                    color: 'var(--text-dark)',
                    border: '2.5px solid var(--text-dark)',
                    borderRadius: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    boxShadow: '3px 3px 0px 0px var(--text-dark)'
                  }}
                >
                  {shareCopied ? (
                    <>
                      <ClipboardCheck size={16} style={{ color: 'var(--primary)' }} />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Share2 size={16} />
                      Copy Link
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Buttons row */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', borderTop: '1px solid var(--border-soft)', paddingTop: '32px' }}>
              {event.link && (
                <a href={event.link} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                  <Globe size={18} /> Official Event Website
                </a>
              )}
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn btn-outline"
              >
                <MapPin size={18} /> Get Directions
              </a>
            </div>

          </div>
        </div>

        {/* Facebook Review Sharing Helper (Admin Assistant Tool) */}
        {isAdmin && (
          <div className="admin-sharing-helper">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </div>
              <div>
                <h3 style={{ fontWeight: 900, color: 'var(--text-dark)' }}>Admin Sharing Assistant</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Generate and copy a perfectly-formatted post to the Little Locals Facebook page!</p>
              </div>
            </div>

            <div style={{ 
              backgroundColor: 'var(--bg-white)', 
              padding: '20px', 
              borderRadius: 'var(--radius-md)', 
              border: '1px solid var(--border-soft)',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap',
              maxHeight: '220px',
              overflowY: 'auto',
              marginBottom: '20px',
              color: 'var(--text-dark)',
              wordBreak: 'break-all',
              overflowWrap: 'anywhere'
            }}>
              {getFormattedFacebookPost()}
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button 
                className={`btn ${copied ? 'btn-secondary' : 'btn-primary'} copy-btn`} 
                onClick={handleCopyToClipboard}
              >
                {copied ? (
                  <>
                    <ClipboardCheck size={18} /> Caption Copied!
                  </>
                ) : (
                  <>
                    <Share2 size={18} /> Copy Facebook Caption
                  </>
                )}
              </button>
              <a 
                href="https://www.facebook.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn btn-outline"
              >
                Open Facebook
              </a>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
