import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, getDocs, doc, deleteDoc, addDoc, query, orderBy } from 'firebase/firestore';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../firebase';
import { Plus, Edit2, Trash2, LogOut, Search, Calendar, MapPin, Smile, CheckCircle, XCircle, BookOpen } from 'lucide-react';

export default function AdminDashboard() {
  const [events, setEvents] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [posts, setPosts] = useState([]);
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

  const filteredEvents = events.filter(event => 
    (event.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (event.location?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const filteredPosts = posts.filter(post => 
    (post.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (post.category?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Top Welcome Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', borderBottom: '1px solid var(--border-soft)', paddingBottom: '24px', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontWeight: 900, fontSize: '2rem', margin: 0 }}>
            Welcome back, <span className="text-gradient">Wife Admin</span>!
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Promote free Central Coast events and write helpful family guides.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link to="/admin/events/new" className="btn btn-primary" style={{ padding: '10px 20px', fontSize: '0.85rem' }}>
            <Plus size={16} /> Create Event
          </Link>
          <Link to="/admin/blog/new" className="btn btn-secondary" style={{ padding: '10px 20px', fontSize: '0.85rem' }}>
            <BookOpen size={16} /> Write Blog Post
          </Link>
          <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '10px 20px', fontSize: '0.85rem', gap: '6px' }}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--border-soft)', marginBottom: '28px', gap: '20px', flexWrap: 'wrap' }}>
        <button 
          onClick={() => { setActiveTab('events'); setSearchTerm(''); }} 
          style={{ 
            background: 'none', 
            border: 'none', 
            padding: '12px 20px', 
            fontWeight: '800', 
            fontSize: '1rem',
            cursor: 'pointer',
            color: activeTab === 'events' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'events' ? '3px solid var(--primary)' : '3px solid transparent',
            marginBottom: '-2px',
            transition: 'var(--transition-smooth)'
          }}
        >
          Live Events ({events.length})
        </button>

        <button 
          onClick={() => { setActiveTab('posts'); setSearchTerm(''); }} 
          style={{ 
            background: 'none', 
            border: 'none', 
            padding: '12px 20px', 
            fontWeight: '800', 
            fontSize: '1rem',
            cursor: 'pointer',
            color: activeTab === 'posts' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'posts' ? '3px solid var(--primary)' : '3px solid transparent',
            marginBottom: '-2px',
            transition: 'var(--transition-smooth)'
          }}
        >
          Blog Posts ({posts.length})
        </button>
        
        <button 
          onClick={() => { setActiveTab('suggestions'); setSearchTerm(''); }} 
          style={{ 
            background: 'none', 
            border: 'none', 
            padding: '12px 20px', 
            fontWeight: '800', 
            fontSize: '1rem',
            cursor: 'pointer',
            color: activeTab === 'suggestions' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'suggestions' ? '3px solid var(--primary)' : '3px solid transparent',
            marginBottom: '-2px',
            transition: 'var(--transition-smooth)'
          }}
        >
          Suggested Scrapes ({suggestions.length})
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ fontWeight: '700', color: 'var(--text-muted)' }}>Loading dashboard...</p>
        </div>
      ) : activeTab === 'events' ? (
        
        /* Tab: Live Events List */
        <div>
          {/* Search Events box */}
          <div style={{ position: 'relative', maxWidth: '400px', marginBottom: '24px' }}>
            <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
            <input 
              type="text" 
              placeholder="Search current listings..." 
              className="form-control"
              style={{ paddingLeft: '48px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {filteredEvents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', backgroundColor: 'var(--bg-white)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-soft)' }}>
              <Smile size={32} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
              <h3 style={{ fontWeight: 800 }}>No live listings found</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Create an event to show up on the homepage!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredEvents.map(event => (
                <div 
                  key={event.id}
                  style={{ 
                    backgroundColor: 'var(--bg-white)', 
                    borderRadius: 'var(--radius-md)', 
                    padding: '20px 24px', 
                    border: '1px solid var(--border-soft)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '16px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexGrow: 1, minWidth: '280px' }}>
                    <img 
                      src={event.image_url || 'https://images.unsplash.com/photo-1596464716127-f2a82984de30?auto=format&fit=crop&w=150&q=80'} 
                      alt="" 
                      style={{ width: '60px', height: '60px', borderRadius: 'var(--radius-sm)', objectFit: 'cover' }}
                    />
                    <div style={{ textAlign: 'left' }}>
                      <span className="badge badge-coral" style={{ fontSize: '0.7rem', padding: '4px 10px', marginBottom: '6px' }}>
                        {event.category || 'General'}
                      </span>
                      <h4 style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-dark)' }}>{event.title}</h4>
                      
                      <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={12} /> {event.date ? new Date(event.date).toLocaleDateString('en-AU') : 'Flexible'}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={12} /> {event.location?.split(',')[0]}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions column */}
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <Link to={`/admin/events/${event.id}/edit`} className="btn btn-outline" style={{ padding: '8px 16px', fontSize: '0.8rem', gap: '6px' }}>
                      <Edit2 size={14} /> Edit
                    </Link>
                    <button 
                      onClick={() => handleDeleteEvent(event.id)} 
                      className="btn btn-outline" 
                      style={{ padding: '8px 16px', fontSize: '0.8rem', gap: '6px', color: 'hsl(0, 80%, 45%)', borderColor: 'hsl(0, 100%, 94%)' }}
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
          <div style={{ position: 'relative', maxWidth: '400px', marginBottom: '24px' }}>
            <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
            <input 
              type="text" 
              placeholder="Search blog posts..." 
              className="form-control"
              style={{ paddingLeft: '48px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {filteredPosts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', backgroundColor: 'var(--bg-white)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-soft)' }}>
              <BookOpen size={32} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
              <h3 style={{ fontWeight: 800 }}>No blog posts found</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Write a parenting review or guide to share with the community!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredPosts.map(post => (
                <div 
                  key={post.id}
                  style={{ 
                    backgroundColor: 'var(--bg-white)', 
                    borderRadius: 'var(--radius-md)', 
                    padding: '20px 24px', 
                    border: '1px solid var(--border-soft)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '16px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexGrow: 1, minWidth: '280px' }}>
                    <img 
                      src={post.image_url || 'https://images.unsplash.com/photo-1502082553048-f2a82984de30?auto=format&fit=crop&w=150&q=80'} 
                      alt="" 
                      style={{ width: '60px', height: '60px', borderRadius: 'var(--radius-sm)', objectFit: 'cover' }}
                    />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                        <span className="badge badge-blue" style={{ fontSize: '0.7rem', padding: '4px 10px' }}>
                          {post.category || 'Review'}
                        </span>
                        {post.is_published ? (
                          <span className="badge badge-free" style={{ fontSize: '0.65rem', padding: '2px 8px', fontWeight: '800' }}>Live</span>
                        ) : (
                          <span className="badge badge-yellow" style={{ fontSize: '0.65rem', padding: '2px 8px', fontWeight: '800' }}>Draft</span>
                        )}
                      </div>
                      <h4 style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-dark)' }}>{post.title}</h4>
                      
                      <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={12} /> {post.date ? new Date(post.date).toLocaleDateString('en-AU') : 'Flexible'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions column */}
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <Link to={`/admin/blog/${post.id}/edit`} className="btn btn-outline" style={{ padding: '8px 16px', fontSize: '0.8rem', gap: '6px' }}>
                      <Edit2 size={14} /> Edit
                    </Link>
                    <button 
                      onClick={() => handleDeletePost(post.id)} 
                      className="btn btn-outline" 
                      style={{ padding: '8px 16px', fontSize: '0.8rem', gap: '6px', color: 'hsl(0, 80%, 45%)', borderColor: 'hsl(0, 100%, 94%)' }}
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
          <div style={{ textAlign: 'left', marginBottom: '24px', backgroundColor: 'hsl(168, 76%, 98%)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid hsl(168, 76%, 90%)' }}>
            <h4 style={{ fontWeight: 800, color: 'var(--teal)' }}>Collate & Approve Scraped Facebook Events</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              These are free family activities identified on local Central Coast pages. Review the event parameters and click Approve to push them live to she's website!
            </p>
          </div>

          {suggestions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', backgroundColor: 'var(--bg-white)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-soft)' }}>
              <Smile size={32} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
              <h3 style={{ fontWeight: 800 }}>No scraper suggestions at this time</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>When the scraper is executed from the portal, findings will appear here.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {suggestions.map(s => (
                <div 
                  key={s.id}
                  style={{ 
                    backgroundColor: 'var(--bg-white)', 
                    borderRadius: 'var(--radius-md)', 
                    padding: '24px', 
                    border: '1px solid var(--border-soft)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <span className="badge badge-yellow" style={{ marginBottom: '8px' }}>Scraped Facebook Lead</span>
                      <h3 style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-dark)' }}>{s.title}</h3>
                    </div>
                    
                    {/* Approve/Dismiss Actions */}
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button 
                        onClick={() => handleApproveSuggestion(s)} 
                        className="btn btn-secondary" 
                        style={{ padding: '8px 18px', fontSize: '0.85rem', gap: '6px' }}
                      >
                        <CheckCircle size={16} /> Approve & Publish
                      </button>
                      <button 
                        onClick={() => handleRejectSuggestion(s.id)} 
                        className="btn btn-outline" 
                        style={{ padding: '8px 18px', fontSize: '0.85rem', gap: '6px', color: 'hsl(0, 80%, 45%)' }}
                      >
                        <XCircle size={16} /> Dismiss
                      </button>
                    </div>
                  </div>

                  {/* Scraped Parameters summary */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '0.85rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-cream)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
                    <div><strong>Date:</strong> {s.date || 'Flexible'}</div>
                    <div><strong>Time:</strong> {s.time || 'Not specified'}</div>
                    <div><strong>Location:</strong> {s.location || 'Not specified'}</div>
                    <div><strong>Category Lead:</strong> {s.category || 'General'}</div>
                  </div>

                  <div>
                    <h5 style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: '4px' }}>Extracted Summary</h5>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-dark)', lineHeight: '1.5' }}>{s.description}</p>
                  </div>

                  {s.link && (
                    <a href={s.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', color: 'var(--secondary)', fontWeight: '700', textDecoration: 'underline' }}>
                      View original Facebook lead source
                    </a>
                  )}

                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
