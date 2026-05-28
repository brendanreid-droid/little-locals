import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Search, BookOpen, Clock, Calendar, ArrowRight, Smile } from 'lucide-react';

export default function BlogList() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Review', 'Parenting Guide', 'School Holidays', 'Tips & Hacks'];

  useEffect(() => {
    async function fetchPosts() {
      try {
        const postsCol = collection(db, 'posts');
        const q = query(postsCol, orderBy('date', 'desc'));
        const snapshot = await getDocs(q);
        const postData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPosts(postData);
      } catch (error) {
        console.error("Error fetching blog posts:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchPosts();
  }, []);

  const filteredPosts = posts.filter(post => {
    // Only show published posts in public view
    if (post.is_published === false) return false;

    const matchesSearch = 
      (post.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (post.content?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (post.excerpt?.toLowerCase() || '').includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Delightful Hero Banner */}
      <div style={{ textAlign: 'center', marginBottom: '48px', animation: 'slideUp 0.4s ease' }}>
        <div style={{ display: 'inline-flex', padding: '6px 16px', background: 'hsl(198, 93%, 95%)', color: 'var(--secondary)', borderRadius: '50px', fontWeight: '800', fontSize: '0.85rem', marginBottom: '16px', gap: '8px', alignItems: 'center' }}>
          <BookOpen size={16} /> Central Coast Parenting Reviews & Guides
        </div>
        <h1 style={{ fontWeight: 900, marginBottom: '16px', color: 'var(--text-dark)' }}>
          Little Locals <span className="text-gradient-coral">Family Blog</span>
        </h1>
        <p style={{ fontSize: '1.15rem', color: 'var(--text-muted)', maxWidth: '650px', margin: '0 auto' }}>
          Read honest, detailed playground reviews, school holiday planners, and local activity roundups written by parents, for parents.
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          
          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={20} />
            <input 
              type="text" 
              placeholder="Search reviews, guides, holiday tips..." 
              className="form-control"
              style={{ paddingLeft: '48px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Categories Horizontal Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {categories.map(cat => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`btn ${isActive ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '8px 18px', fontSize: '0.85rem' }}
                >
                  {cat}
                </button>
              );
            })}
          </div>

        </div>
      </div>

      {/* Main Blog list rendering */}
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
          <p style={{ fontWeight: '700', color: 'var(--text-muted)' }}>Loading family articles...</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px', 
          backgroundColor: 'var(--bg-white)', 
          borderRadius: 'var(--radius-lg)', 
          border: '1px dashed var(--border-soft)' 
        }}>
          <Smile size={48} style={{ color: 'var(--primary)', marginBottom: '16px' }} />
          <h3 style={{ fontWeight: 800, fontSize: '1.4rem', marginBottom: '8px' }}>No blog posts found</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px', maxWidth: '400px', margin: '0 auto' }}>
            We couldn't find any articles matching your search query. Please check back later for exciting reviews!
          </p>
          <button className="btn btn-outline" onClick={() => { setSearchTerm(''); setSelectedCategory('All'); }}>
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="event-grid">
          {filteredPosts.map(post => {
            // Calculate reading time (roughly 200 words per minute)
            const words = post.content?.split(/\s+/).length || 0;
            const readTime = Math.max(1, Math.ceil(words / 200));

            return (
              <article key={post.id} className="event-card">
                <div className="event-image-container">
                  <img 
                    src={post.image_url || 'https://images.unsplash.com/photo-1502082553048-f2a82984de30?auto=format&fit=crop&w=600&q=80'} 
                    alt={post.title} 
                    className="event-image" 
                  />
                  <div className="event-details-bar" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.85))' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={12} /> {post.date ? new Date(post.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Flexible'}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {readTime} min read
                    </span>
                  </div>
                </div>

                <div className="event-card-content" style={{ gap: '10px' }}>
                  <span className="badge badge-blue" style={{ alignSelf: 'flex-start' }}>
                    {post.category || 'Review'}
                  </span>
                  <h3 className="event-card-title">{post.title}</h3>
                  <p className="event-card-description" style={{ fontSize: '0.9rem' }}>{post.excerpt || post.content?.slice(0, 120) + '...'}</p>
                  
                  <div className="event-card-footer" style={{ marginTop: 'auto', paddingTop: '12px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                      By Little Locals
                    </span>
                    <Link to={`/blog/${post.id}`} className="btn btn-secondary btn-icon-only" title="Read Article">
                      <ArrowRight size={18} />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* CSS Spin Keyframe */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

    </div>
  );
}
