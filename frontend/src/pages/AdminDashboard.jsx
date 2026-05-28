import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, getDocs, doc, deleteDoc, addDoc, query, orderBy } from 'firebase/firestore';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../firebase';
import { Plus, Edit2, Trash2, LogOut, Search, Calendar, MapPin, Smile, CheckCircle, XCircle, BookOpen, Cpu, RefreshCw } from 'lucide-react';

export default function AdminDashboard() {
  const [events, setEvents] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [posts, setPosts] = useState([]);
  const [scraping, setScraping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('events'); // 'events', 'suggestions', or 'posts'
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  // Authentication check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/admin/login');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Load database items
  useEffect(() => {
    async function loadData() {
      try {
        // Fetch events
        const eventsCol = collection(db, 'events');
        const eq = query(eventsCol, orderBy('date', 'asc'));
        const eventSnapshot = await getDocs(eq);
        setEvents(eventSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Fetch suggestions (from scraper queue)
        const suggestionsCol = collection(db, 'suggestions');
        const suggestionSnapshot = await getDocs(suggestionsCol);
        setSuggestions(suggestionSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Fetch blog posts
        const postsCol = collection(db, 'posts');
        const pq = query(postsCol, orderBy('date', 'desc'));
        const postSnapshot = await getDocs(pq);
        setPosts(postSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      } catch (error) {
        console.error("Error loading admin dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm("Are you sure you want to delete this event listing?")) return;
    
    try {
      await deleteDoc(doc(db, 'events', id));
      setEvents(prev => prev.filter(event => event.id !== id));
    } catch (error) {
      console.error("Error deleting event:", error);
      alert("Failed to delete event: " + error.message);
    }
  };

  const handleDeletePost = async (id) => {
    if (!window.confirm("Are you sure you want to delete this blog post?")) return;
    
    try {
      await deleteDoc(doc(db, 'posts', id));
      setPosts(prev => prev.filter(post => post.id !== id));
    } catch (error) {
      console.error("Error deleting post:", error);
      alert("Failed to delete blog post: " + error.message);
    }
  };

  const handleApproveSuggestion = async (suggestion) => {
    try {
      // Add to main events collection
      const eventsCol = collection(db, 'events');
      await addDoc(eventsCol, {
        title: suggestion.title,
        date: suggestion.date || '',
        time: suggestion.time || '',
        location: suggestion.location || '',
        description: suggestion.description || '',
        image_url: suggestion.image_url || '',
        price: 'FREE',
        link: suggestion.link || '',
        category: suggestion.category || 'Playground',
        age_group: suggestion.age_group || 'All Ages'
      });

      // Delete from suggestions queue
      await deleteDoc(doc(db, 'suggestions', suggestion.id));
      
      // Update UI state
      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
      
      // Refresh events
      const eventsColRef = collection(db, 'events');
      const eq = query(eventsColRef, orderBy('date', 'asc'));
      const eventSnapshot = await getDocs(eq);
      setEvents(eventSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      
      alert("Suggested event approved and added to live calendar!");
    } catch (error) {
      console.error("Error approving suggestion:", error);
      alert("Failed to approve suggestion: " + error.message);
    }
  };

  const handleRejectSuggestion = async (id) => {
    if (!window.confirm("Dismiss this scraped event suggestion?")) return;
    
    try {
      await deleteDoc(doc(db, 'suggestions', id));
      setSuggestions(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error("Error rejecting suggestion:", error);
      alert("Failed to dismiss suggestion: " + error.message);
    }
  };

  const handleRunScraper = async () => {
    setScraping(true);
    try {
      const response = await fetch('/api/scrape-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to execute scraper.');
      }
      
      const newSuggestions = data.suggestions || [];
      if (newSuggestions.length === 0) {
        alert("Scraper executed successfully, but found no new free events this time.");
        setScraping(false);
        return;
      }
      
      // Save each scraped suggestion to Firestore
      const suggestionsCol = collection(db, 'suggestions');
      const addedSuggestions = [];
      
      for (const item of newSuggestions) {
        const docRef = await addDoc(suggestionsCol, item);
        addedSuggestions.push({ id: docRef.id, ...item });
      }
      
      // Update local state instantly so the user sees the new listings
      setSuggestions(prev => [...addedSuggestions, ...prev]);
      
      alert(`Scraper completed successfully! (${data.mode})\n\nFound and loaded ${newSuggestions.length} new suggested activities into your queue.`);
    } catch (error) {
      console.error("Scraper handler error:", error);
      alert("Scraper run encountered an error: " + error.message);
    } finally {
      setScraping(false);
    }
  };

  const filteredEvents = events.filter(event => 
    (event.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (event.location?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const filteredPosts = posts.filter(post => 
    (post.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (post.category?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ 
      padding: '48px 24px', 
      maxWidth: '1280px', 
      margin: '0 auto',
      backgroundColor: 'var(--bg-cream)',
      minHeight: '100vh'
    }}>
      
      {/* Top Welcome Panel */}
      <div 
        className="sticker-shadow"
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '24px', 
          border: '3.5px solid var(--text-dark)', 
          padding: '32px', 
          borderRadius: '24px',
          backgroundColor: 'var(--bg-white)',
          boxShadow: '6px 6px 0px 0px var(--text-dark)',
          marginBottom: '48px',
          animation: 'slideUp 0.4s ease'
        }}
      >
        <div style={{ textAlign: 'left' }}>
          <h1 style={{ 
            fontFamily: 'var(--font-display)',
            fontWeight: 900, 
            fontSize: '2.2rem', 
            margin: 0,
            color: 'var(--primary)',
            letterSpacing: '-0.01em'
          }}>
            Welcome back, <span style={{ color: 'var(--secondary)' }}>Admin</span>!
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '6px', fontWeight: '600' }}>
            Promote free Central Coast events and write helpful family guides.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link 
            to="/admin/events/new" 
            style={{ 
              padding: '12px 24px', 
              fontSize: '0.85rem',
              fontWeight: '800',
              backgroundColor: 'var(--secondary)',
              color: 'white',
              border: '3px solid var(--text-dark)',
              borderRadius: '50px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '3px 3px 0px 0px var(--text-dark)',
              transition: 'var(--transition-bouncy)'
            }}
            className="admin-action-btn"
          >
            <Plus size={16} /> Create Event
          </Link>
          <Link 
            to="/admin/blog/new" 
            style={{ 
              padding: '12px 24px', 
              fontSize: '0.85rem',
              fontWeight: '800',
              backgroundColor: 'var(--primary)',
              color: 'white',
              border: '3px solid var(--text-dark)',
              borderRadius: '50px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '3px 3px 0px 0px var(--text-dark)',
              transition: 'var(--transition-bouncy)'
            }}
            className="admin-action-btn"
          >
            <BookOpen size={16} /> Write Blog Post
          </Link>
          <button 
            onClick={handleLogout} 
            style={{ 
              padding: '12px 24px', 
              fontSize: '0.85rem',
              fontWeight: '800',
              backgroundColor: 'var(--bg-white)',
              color: 'var(--text-dark)',
              border: '3px solid var(--text-dark)',
              borderRadius: '50px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '3px 3px 0px 0px var(--text-dark)',
              transition: 'var(--transition-bouncy)'
            }}
            className="admin-action-btn"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div style={{ 
        display: 'flex', 
        marginBottom: '36px', 
        gap: '16px', 
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <button 
          onClick={() => { setActiveTab('events'); setSearchTerm(''); }} 
          style={{ 
            padding: '12px 28px', 
            fontWeight: '800', 
            fontSize: '0.95rem',
            cursor: 'pointer',
            border: '3px solid var(--text-dark)',
            borderRadius: '50px',
            backgroundColor: activeTab === 'events' ? 'var(--primary)' : 'var(--bg-white)',
            color: activeTab === 'events' ? 'white' : 'var(--text-dark)',
            boxShadow: activeTab === 'events' ? '3px 3px 0px 0px var(--text-dark)' : 'none',
            transform: activeTab === 'events' ? 'translateY(-2px)' : 'none',
            transition: 'var(--transition-bouncy)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
          className="admin-tab-btn"
        >
          Live Events ({events.length})
        </button>

        <button 
          onClick={() => { setActiveTab('posts'); setSearchTerm(''); }} 
          style={{ 
            padding: '12px 28px', 
            fontWeight: '800', 
            fontSize: '0.95rem',
            cursor: 'pointer',
            border: '3px solid var(--text-dark)',
            borderRadius: '50px',
            backgroundColor: activeTab === 'posts' ? 'var(--primary)' : 'var(--bg-white)',
            color: activeTab === 'posts' ? 'white' : 'var(--text-dark)',
            boxShadow: activeTab === 'posts' ? '3px 3px 0px 0px var(--text-dark)' : 'none',
            transform: activeTab === 'posts' ? 'translateY(-2px)' : 'none',
            transition: 'var(--transition-bouncy)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
          className="admin-tab-btn"
        >
          Blog Posts ({posts.length})
        </button>
        
        <button 
          onClick={() => { setActiveTab('suggestions'); setSearchTerm(''); }} 
          style={{ 
            padding: '12px 28px', 
            fontWeight: '800', 
            fontSize: '0.95rem',
            cursor: 'pointer',
            border: '3px solid var(--text-dark)',
            borderRadius: '50px',
            backgroundColor: activeTab === 'suggestions' ? 'var(--primary)' : 'var(--bg-white)',
            color: activeTab === 'suggestions' ? 'white' : 'var(--text-dark)',
            boxShadow: activeTab === 'suggestions' ? '3px 3px 0px 0px var(--text-dark)' : 'none',
            transform: activeTab === 'suggestions' ? 'translateY(-2px)' : 'none',
            transition: 'var(--transition-bouncy)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
          className="admin-tab-btn"
        >
          Suggested Scrapes ({suggestions.length})
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ 
            width: '60px', 
            height: '60px', 
            border: '6px solid var(--primary-soft)', 
            borderTopColor: 'var(--primary)', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            margin: '0 auto 24px'
          }} />
          <p style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '1.1rem' }}>Loading dashboard...</p>
        </div>
      ) : activeTab === 'events' ? (
        
        /* Tab: Live Events List */
        <div>
          {/* Search Events box */}
          <div style={{ position: 'relative', maxWidth: '440px', marginBottom: '32px' }}>
            <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
            <input 
              type="text" 
              placeholder="Search current listings..." 
              className="form-control"
              style={{ 
                paddingLeft: '48px',
                border: '3px solid var(--text-dark)',
                borderRadius: '50px',
                backgroundColor: 'var(--bg-white)',
                boxShadow: 'none',
                height: '48px'
              }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {filteredEvents.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '64px 24px', 
              backgroundColor: 'var(--bg-white)', 
              borderRadius: '24px', 
              border: '3px dashed var(--text-dark)',
              boxShadow: '6px 6px 0px 0px var(--text-dark)'
            }}>
              <Smile size={48} style={{ color: 'var(--secondary)', marginBottom: '16px' }} />
              <h3 style={{ fontWeight: 900, fontSize: '1.4rem', color: 'var(--primary)' }}>No live listings found</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '6px', fontSize: '0.95rem' }}>Create an event to show up on the homepage!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {filteredEvents.map(event => (
                <div 
                  key={event.id}
                  className="sticker-shadow"
                  style={{ 
                    backgroundColor: 'var(--bg-white)', 
                    borderRadius: '20px', 
                    padding: '24px 32px', 
                    border: '3px solid var(--text-dark)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '20px',
                    boxShadow: '6px 6px 0px 0px var(--text-dark)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexGrow: 1, minWidth: '280px', textAlign: 'left' }}>
                    <img 
                      src={event.image_url || 'https://images.unsplash.com/photo-1596464716127-f2a82984de30?auto=format&fit=crop&w=150&q=80'} 
                      alt="" 
                      style={{ 
                        width: '70px', 
                        height: '70px', 
                        borderRadius: '12px', 
                        objectFit: 'cover',
                        border: '2px solid var(--text-dark)'
                      }}
                    />
                    <div>
                      <span style={{ 
                        backgroundColor: 'var(--primary-soft)', 
                        color: 'var(--primary)', 
                        fontSize: '0.72rem', 
                        padding: '4px 12px', 
                        marginBottom: '8px',
                        borderRadius: '6px',
                        border: '2px solid var(--text-dark)',
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        display: 'inline-block'
                      }}>
                        {event.category || 'General'}
                      </span>
                      <h4 style={{ fontWeight: 900, fontSize: '1.2rem', color: 'var(--primary)', margin: 0 }}>{event.title}</h4>
                      
                      <div style={{ display: 'flex', gap: '16px', fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '8px', fontWeight: '700' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={13} style={{ color: 'var(--secondary)' }} /> {event.date ? new Date(event.date).toLocaleDateString('en-AU') : 'Flexible'}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={13} style={{ color: 'var(--secondary)' }} /> {event.location?.split(',')[0]}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions column */}
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <Link 
                      to={`/admin/events/${event.id}/edit`} 
                      style={{ 
                        padding: '10px 18px', 
                        fontSize: '0.85rem', 
                        fontWeight: '800',
                        backgroundColor: 'var(--bg-white)',
                        color: 'var(--text-dark)',
                        border: '3.5px solid var(--text-dark)',
                        borderRadius: '50px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        boxShadow: '3px 3px 0px 0px var(--text-dark)',
                        transition: 'var(--transition-bouncy)'
                      }}
                      className="admin-list-btn"
                    >
                      <Edit2 size={14} /> Edit
                    </Link>
                    <button 
                      onClick={() => handleDeleteEvent(event.id)} 
                      style={{ 
                        padding: '10px 18px', 
                        fontSize: '0.85rem', 
                        fontWeight: '800',
                        backgroundColor: 'var(--bg-white)',
                        color: 'hsl(0, 80%, 40%)',
                        border: '3.5px solid var(--text-dark)',
                        borderRadius: '50px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        boxShadow: '3px 3px 0px 0px var(--text-dark)',
                        transition: 'var(--transition-bouncy)'
                      }}
                      className="admin-list-btn"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'posts' ? (

        /* Tab: Blog Posts List */
        <div>
          {/* Search Posts box */}
          <div style={{ position: 'relative', maxWidth: '440px', marginBottom: '32px' }}>
            <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
            <input 
              type="text" 
              placeholder="Search blog posts..." 
              className="form-control"
              style={{ 
                paddingLeft: '48px',
                border: '3px solid var(--text-dark)',
                borderRadius: '50px',
                backgroundColor: 'var(--bg-white)',
                boxShadow: 'none',
                height: '48px'
              }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {filteredPosts.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '64px 24px', 
              backgroundColor: 'var(--bg-white)', 
              borderRadius: '24px', 
              border: '3px dashed var(--text-dark)',
              boxShadow: '6px 6px 0px 0px var(--text-dark)'
            }}>
              <BookOpen size={48} style={{ color: 'var(--secondary)', marginBottom: '16px' }} />
              <h3 style={{ fontWeight: 900, fontSize: '1.4rem', color: 'var(--primary)' }}>No blog posts found</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '6px', fontSize: '0.95rem' }}>Write a parenting review or guide to share with the community!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {filteredPosts.map(post => (
                <div 
                  key={post.id}
                  className="sticker-shadow"
                  style={{ 
                    backgroundColor: 'var(--bg-white)', 
                    borderRadius: '20px', 
                    padding: '24px 32px', 
                    border: '3px solid var(--text-dark)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '20px',
                    boxShadow: '6px 6px 0px 0px var(--text-dark)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexGrow: 1, minWidth: '280px', textAlign: 'left' }}>
                    <img 
                      src={post.image_url || 'https://images.unsplash.com/photo-1502082553048-f2a82984de30?auto=format&fit=crop&w=150&q=80'} 
                      alt="" 
                      style={{ 
                        width: '70px', 
                        height: '70px', 
                        borderRadius: '12px', 
                        objectFit: 'cover',
                        border: '2px solid var(--text-dark)'
                      }}
                    />
                    <div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ 
                          backgroundColor: 'var(--secondary-soft)', 
                          color: 'var(--secondary)', 
                          fontSize: '0.72rem', 
                          padding: '4px 12px', 
                          borderRadius: '6px',
                          border: '2px solid var(--text-dark)',
                          fontWeight: '800',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          {post.category || 'Review'}
                        </span>
                        {post.is_published ? (
                          <span style={{ 
                            backgroundColor: 'var(--primary-soft)', 
                            color: 'var(--primary)', 
                            fontSize: '0.65rem', 
                            padding: '3px 8px', 
                            fontWeight: '800',
                            borderRadius: '4px',
                            border: '1.5px solid var(--primary)',
                            textTransform: 'uppercase'
                          }}>Live</span>
                        ) : (
                          <span style={{ 
                            backgroundColor: 'var(--yellow-soft)', 
                            color: 'hsl(14, 90%, 35%)', 
                            fontSize: '0.65rem', 
                            padding: '3px 8px', 
                            fontWeight: '800',
                            borderRadius: '4px',
                            border: '1.5px solid var(--yellow)',
                            textTransform: 'uppercase'
                          }}>Draft</span>
                        )}
                      </div>
                      <h4 style={{ fontWeight: 900, fontSize: '1.2rem', color: 'var(--primary)', margin: 0 }}>{post.title}</h4>
                      
                      <div style={{ display: 'flex', gap: '16px', fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '8px', fontWeight: '700' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={13} style={{ color: 'var(--secondary)' }} /> {post.date ? new Date(post.date).toLocaleDateString('en-AU') : 'Flexible'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions column */}
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <Link 
                      to={`/admin/blog/${post.id}/edit`} 
                      style={{ 
                        padding: '10px 18px', 
                        fontSize: '0.85rem', 
                        fontWeight: '800',
                        backgroundColor: 'var(--bg-white)',
                        color: 'var(--text-dark)',
                        border: '3.5px solid var(--text-dark)',
                        borderRadius: '50px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        boxShadow: '3px 3px 0px 0px var(--text-dark)',
                        transition: 'var(--transition-bouncy)'
                      }}
                      className="admin-list-btn"
                    >
                      <Edit2 size={14} /> Edit
                    </Link>
                    <button 
                      onClick={() => handleDeletePost(post.id)} 
                      style={{ 
                        padding: '10px 18px', 
                        fontSize: '0.85rem', 
                        fontWeight: '800',
                        backgroundColor: 'var(--bg-white)',
                        color: 'hsl(0, 80%, 40%)',
                        border: '3.5px solid var(--text-dark)',
                        borderRadius: '50px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        boxShadow: '3px 3px 0px 0px var(--text-dark)',
                        transition: 'var(--transition-bouncy)'
                      }}
                      className="admin-list-btn"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

      ) : (
        
        /* Tab: Suggested Scrapes List */
        <div>
          <div 
            className="sticker-shadow"
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              flexWrap: 'wrap', 
              gap: '24px', 
              textAlign: 'left', 
              marginBottom: '36px', 
              backgroundColor: 'var(--bg-white)', 
              padding: '32px', 
              borderRadius: '24px', 
              border: '3.5px solid var(--text-dark)',
              boxShadow: '6px 6px 0px 0px var(--text-dark)'
            }}
          >
            <div style={{ flex: '1 1 500px' }}>
              <h4 style={{ 
                fontFamily: 'var(--font-display)',
                fontWeight: 900, 
                color: 'var(--primary)',
                fontSize: '1.4rem',
                margin: 0
              }}>
                Collate & Approve Scraped Facebook Events
              </h4>
              <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', marginTop: '8px', fontWeight: '600', lineHeight: 1.5 }}>
                These are free family activities identified on local Central Coast pages. Review the event parameters and click Approve to push them live to the website!
              </p>
            </div>
            <div>
              <button 
                onClick={handleRunScraper} 
                disabled={scraping}
                style={{ 
                  padding: '14px 28px', 
                  fontSize: '0.9rem', 
                  fontWeight: '800',
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  backgroundColor: scraping ? 'var(--bg-cream)' : 'var(--secondary)',
                  border: '3.5px solid var(--text-dark)',
                  color: scraping ? 'var(--text-muted)' : 'white',
                  borderRadius: '50px',
                  cursor: 'pointer',
                  boxShadow: scraping ? 'none' : '3px 3px 0px 0px var(--text-dark)',
                  transition: 'var(--transition-bouncy)'
                }}
                className="scraper-btn-glow"
              >
                {scraping ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} /> Crawling Feeds...
                  </>
                ) : (
                  <>
                    <Cpu size={16} /> Run Scraper Now
                  </>
                )}
              </button>
            </div>
          </div>

          {suggestions.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '64px 24px', 
              backgroundColor: 'var(--bg-white)', 
              borderRadius: '24px', 
              border: '3px dashed var(--text-dark)',
              boxShadow: '6px 6px 0px 0px var(--text-dark)'
            }}>
              <Smile size={48} style={{ color: 'var(--secondary)', marginBottom: '16px' }} />
              <h3 style={{ fontWeight: 900, fontSize: '1.4rem', color: 'var(--primary)' }}>No scraper suggestions at this time</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '6px', fontSize: '0.95rem' }}>When the scraper is executed from the portal, findings will appear here.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              {suggestions.map(s => (
                <div 
                  key={s.id}
                  className="sticker-shadow"
                  style={{ 
                    backgroundColor: 'var(--bg-white)', 
                    borderRadius: '24px', 
                    padding: '32px', 
                    border: '3.5px solid var(--text-dark)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                    textAlign: 'left',
                    boxShadow: '6px 6px 0px 0px var(--text-dark)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                      <span style={{ 
                        backgroundColor: 'var(--yellow-soft)', 
                        color: 'hsl(14, 90%, 30%)', 
                        padding: '4px 14px', 
                        borderRadius: '6px',
                        border: '2px solid var(--text-dark)',
                        fontWeight: '800',
                        fontSize: '0.72rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        display: 'inline-block',
                        marginBottom: '10px'
                      }}>
                        Scraped Facebook Lead
                      </span>
                      <h3 style={{ 
                        fontFamily: 'var(--font-display)',
                        fontWeight: 900, 
                        fontSize: '1.4rem', 
                        color: 'var(--primary)',
                        margin: 0
                      }}>{s.title}</h3>
                    </div>
                    
                    {/* Approve/Dismiss Actions */}
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button 
                        onClick={() => handleApproveSuggestion(s)} 
                        style={{ 
                          padding: '10px 20px', 
                          fontSize: '0.85rem', 
                          fontWeight: '800',
                          backgroundColor: 'var(--primary)',
                          color: 'white',
                          border: '3.5px solid var(--text-dark)',
                          borderRadius: '50px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          boxShadow: '3px 3px 0px 0px var(--text-dark)',
                          transition: 'var(--transition-bouncy)'
                        }}
                        className="admin-list-btn"
                      >
                        <CheckCircle size={16} /> Approve
                      </button>
                      <button 
                        onClick={() => handleRejectSuggestion(s.id)} 
                        style={{ 
                          padding: '10px 20px', 
                          fontSize: '0.85rem', 
                          fontWeight: '800',
                          backgroundColor: 'var(--bg-white)',
                          color: 'hsl(0, 80%, 40%)',
                          border: '3.5px solid var(--text-dark)',
                          borderRadius: '50px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          boxShadow: '3px 3px 0px 0px var(--text-dark)',
                          transition: 'var(--transition-bouncy)'
                        }}
                        className="admin-list-btn"
                      >
                        <XCircle size={16} /> Dismiss
                      </button>
                    </div>
                  </div>
 
                  {/* Scraped Parameters summary */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                    gap: '16px', 
                    fontSize: '0.9rem', 
                    color: 'var(--text-dark)', 
                    backgroundColor: 'var(--primary-soft)', 
                    padding: '20px', 
                    borderRadius: '16px',
                    border: '2px solid var(--text-dark)',
                    fontWeight: '700'
                  }}>
                    <div><strong>Date:</strong> {s.date || 'Flexible'}</div>
                    <div><strong>Time:</strong> {s.time || 'Not specified'}</div>
                    <div><strong>Location:</strong> {s.location || 'Not specified'}</div>
                    <div><strong>Category:</strong> {s.category || 'General'}</div>
                  </div>
 
                  <div>
                    <h5 style={{ fontWeight: 900, fontSize: '1rem', color: 'var(--primary)', marginBottom: '8px' }}>Extracted Summary</h5>
                    <p style={{ fontSize: '0.95rem', color: 'var(--text-dark)', lineHeight: '1.6', margin: 0 }}>{s.description}</p>
                  </div>
 
                  {s.link && (
                    <a 
                      href={s.link} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ 
                        fontSize: '0.85rem', 
                        color: 'var(--secondary)', 
                        fontWeight: '800', 
                        textDecoration: 'underline',
                        alignSelf: 'flex-start'
                      }}
                    >
                      View original Facebook lead source
                    </a>
                  )}
 
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Admin specific styles */}
      <style>{`
        .admin-action-btn:hover, .admin-tab-btn:hover, .admin-list-btn:hover, .scraper-btn-glow:hover {
          transform: translate(-3px, -3px) !important;
          box-shadow: 6px 6px 0px 0px var(--text-dark) !important;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
 
    </div>
  );
}

