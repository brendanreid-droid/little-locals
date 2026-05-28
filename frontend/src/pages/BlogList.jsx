import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Search, BookOpen, Clock, Calendar, ArrowRight, Smile, Star, ArrowUpRight } from 'lucide-react';

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

  // Extract featured post (newest post matching search/category)
  const featuredPost = filteredPosts.length > 0 ? filteredPosts[0] : null;
  const remainingPosts = filteredPosts.length > 1 ? filteredPosts.slice(1) : [];

  return (
    <div style={{ 
      padding: '48px 24px', 
      maxWidth: '1280px', 
      margin: '0 auto',
      backgroundColor: 'var(--bg-cream)',
      minHeight: '100vh'
    }}>
      
      {/* Delightful Hero Banner */}
      <div style={{ textAlign: 'center', marginBottom: '64px', animation: 'slideUp 0.5s ease' }}>
        <div style={{ 
          display: 'inline-flex', 
          padding: '8px 18px', 
          background: 'var(--secondary-soft)', 
          color: 'var(--secondary)', 
          borderRadius: '50px', 
          fontWeight: '800', 
          fontSize: '0.85rem', 
          marginBottom: '20px', 
          gap: '8px', 
          alignItems: 'center',
          border: '1.5px solid var(--secondary)'
        }}>
          <BookOpen size={16} /> CENTRAL COAST PARENTING REVIEWS & GUIDES
        </div>
        <h1 style={{ 
          fontWeight: 900, 
          fontSize: '3rem',
          lineHeight: '1.1',
          marginBottom: '20px', 
          color: 'var(--primary)',
          letterSpacing: '-0.02em',
          fontFamily: 'var(--font-display)'
        }}>
          Little Locals <span style={{ color: 'var(--secondary)' }}>Family Blog</span>
        </h1>
        <p style={{ 
          fontSize: '1.15rem', 
          color: 'var(--text-muted)', 
          maxWidth: '700px', 
          margin: '0 auto',
          lineHeight: '1.7',
          fontFamily: 'var(--font-sans)'
        }}>
          Read honest, detailed playground reviews, school holiday planners, and local activity roundups written by parents, for parents.
        </p>
      </div>

      {/* Featured Story Section (Editor's Pick) */}
      {featuredPost && !searchTerm && selectedCategory === 'All' && (
        <section style={{ 
          marginBottom: '80px', 
          animation: 'slideUp 0.6s ease' 
        }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr',
            gap: '40px',
            alignItems: 'center'
          }} className="md:grid-cols-12 event-grid-featured">
            
            {/* Image Column */}
            <div style={{ 
              gridColumn: 'span 7',
              position: 'relative'
            }}>
              <div 
                className="sticker-shadow"
                style={{ 
                  backgroundColor: 'var(--bg-white)', 
                  borderRadius: '24px', 
                  overflow: 'hidden',
                  border: '3px solid var(--text-dark)',
                  transform: 'rotate(-1deg)',
                  boxShadow: '8px 8px 0px 0px var(--text-dark)',
                  transition: 'transform 0.3s ease'
                }}
              >
                <img 
                  src={featuredPost.image_url || 'https://images.unsplash.com/photo-1502082553048-f2a82984de30?auto=format&fit=crop&w=1000&q=80'} 
                  alt={featuredPost.title} 
                  style={{ 
                    width: '100%', 
                    height: '420px', 
                    objectFit: 'cover',
                    display: 'block'
                  }} 
                />
                
                {/* Editor's Pick Badge */}
                <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10 }}>
                  <span style={{ 
                    backgroundColor: 'var(--yellow-soft)', 
                    color: 'hsl(14, 90%, 30%)', 
                    padding: '8px 16px', 
                    borderRadius: '50px', 
                    fontWeight: '800', 
                    fontSize: '0.8rem', 
                    border: '2px solid var(--text-dark)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '3px 3px 0px 0px var(--text-dark)'
                  }}>
                    <Star size={14} fill="currentColor" /> EDITOR'S PICK
                  </span>
                </div>
              </div>
            </div>

            {/* Content Column */}
            <div style={{ 
              gridColumn: 'span 5',
              display: 'flex', 
              flexDirection: 'column', 
              gap: '20px',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ 
                  color: 'var(--secondary)', 
                  fontWeight: '800', 
                  fontSize: '0.85rem', 
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase'
                }}>
                  {featuredPost.category || 'Review'}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>•</span>
                <span style={{ 
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem',
                  fontWeight: '600'
                }}>
                  {Math.max(1, Math.ceil((featuredPost.content?.split(/\s+/).length || 0) / 200))} MIN READ
                </span>
              </div>

              <h2 style={{ 
                fontFamily: 'var(--font-display)',
                fontSize: '2.5rem', 
                fontWeight: '900', 
                color: 'var(--primary)',
                lineHeight: '1.1',
                letterSpacing: '-0.02em',
                margin: 0
              }}>
                {featuredPost.title}
              </h2>

              <p style={{ 
                fontFamily: 'var(--font-sans)',
                fontSize: '1.1rem', 
                color: 'var(--text-dark)',
                lineHeight: '1.7',
                margin: 0,
                opacity: 0.9
              }}>
                {featuredPost.excerpt || featuredPost.content?.slice(0, 180) + '...'}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
                <Link 
                  to={`/blog/${featuredPost.id}`}
                  style={{ 
                    backgroundColor: 'var(--secondary)', 
                    color: 'white', 
                    padding: '14px 28px', 
                    borderRadius: '16px', 
                    fontWeight: '800', 
                    fontSize: '1rem',
                    border: '3px solid var(--text-dark)',
                    boxShadow: '4px 4px 0px 0px var(--text-dark)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'var(--transition-bouncy)',
                    cursor: 'pointer'
                  }}
                  className="btn-featured-story"
                >
                  Read Full Story
                  <ArrowRight size={18} />
                </Link>
              </div>
            </div>

          </div>
        </section>
      )}

      {/* Modern Search & Filters Bar */}
      <div style={{ 
        backgroundColor: 'var(--bg-white)', 
        borderRadius: '24px', 
        padding: '32px', 
        border: '3px solid var(--text-dark)', 
        boxShadow: '6px 6px 0px 0px var(--text-dark)',
        marginBottom: '64px',
        animation: 'slideUp 0.6s ease'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Search Box */}
          <div style={{ position: 'relative', width: '100%' }}>
            <Search style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={20} />
            <input 
              type="text" 
              placeholder="Search reviews, guides, school holidays..." 
              className="form-control"
              style={{ 
                paddingLeft: '56px',
                height: '56px',
                fontSize: '1rem',
                border: '3px solid var(--text-dark)',
                borderRadius: '50px',
                backgroundColor: 'var(--bg-cream)',
                boxShadow: 'none'
              }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Categories Horizontal Selector */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
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
                  className="category-chip-btn"
                >
                  {cat === 'All' ? 'All Posts' : cat}
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
            width: '60px', 
            height: '60px', 
            border: '6px solid var(--primary-soft)', 
            borderTopColor: 'var(--primary)', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            margin: '0 auto 24px'
          }} />
          <p style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '1.1rem' }}>Loading family articles...</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '80px 24px', 
          backgroundColor: 'var(--bg-white)', 
          borderRadius: '24px', 
          border: '3px dashed var(--text-dark)',
          boxShadow: '6px 6px 0px 0px var(--text-dark)'
        }}>
          <Smile size={64} style={{ color: 'var(--secondary)', marginBottom: '20px' }} />
          <h3 style={{ fontWeight: 900, fontSize: '1.8rem', marginBottom: '12px', color: 'var(--primary)' }}>No blog posts found</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '32px', maxWidth: '450px', margin: '0 auto', fontSize: '1.05rem' }}>
            We couldn't find any articles matching your search query. Please check back later for exciting reviews!
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
            onClick={() => { setSearchTerm(''); setSelectedCategory('All'); }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div>
          {/* Section Title */}
          <h3 style={{ 
            fontFamily: 'var(--font-display)', 
            fontSize: '1.8rem', 
            fontWeight: '900', 
            color: 'var(--primary)', 
            textAlign: 'left',
            marginBottom: '32px',
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <BookOpen size={24} style={{ color: 'var(--secondary)' }} /> 
            {searchTerm || selectedCategory !== 'All' ? 'Search Results' : 'Latest Articles'}
          </h3>

          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '36px'
          }}>
            {(searchTerm || selectedCategory !== 'All' ? filteredPosts : remainingPosts).map((post, index) => {
              // Calculate reading time
              const words = post.content?.split(/\s+/).length || 0;
              const readTime = Math.max(1, Math.ceil(words / 200));

              // Playful rotating tilt angles
              const tiltClass = index % 3 === 0 ? 'tilt-left' : index % 3 === 1 ? 'tilt-right' : '';
              const tiltStyle = index % 3 === 0 ? { transform: 'rotate(-1.5deg)' } : index % 3 === 1 ? { transform: 'rotate(1.5deg)' } : {};

              return (
                <article 
                  key={post.id} 
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
                  className={`sticker-blog-card ${tiltClass}`}
                >
                  <div style={{ 
                    position: 'relative', 
                    borderRadius: '14px', 
                    height: '220px', 
                    width: '100%', 
                    overflow: 'hidden',
                    border: '2.5px solid var(--text-dark)'
                  }}>
                    <img 
                      src={post.image_url || 'https://images.unsplash.com/photo-1502082553048-f2a82984de30?auto=format&fit=crop&w=600&q=80'} 
                      alt={post.title} 
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover'
                      }} 
                    />
                    
                    {/* Floating Info Overlays */}
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
                        <Calendar size={12} /> {post.date ? new Date(post.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : 'Flexible'}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> {readTime} min read
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ 
                        backgroundColor: 'var(--secondary-soft)', 
                        color: 'var(--secondary)', 
                        padding: '4px 12px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: '800',
                        border: '2px solid var(--text-dark)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        {post.category || 'Review'}
                      </span>
                    </div>

                    <h3 style={{ 
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.35rem',
                      fontWeight: '900',
                      color: 'var(--primary)',
                      lineHeight: '1.25',
                      margin: 0
                    }}>
                      {post.title}
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
                      {post.excerpt || post.content?.slice(0, 110) + '...'}
                    </p>
                    
                    <div style={{ 
                      marginTop: 'auto', 
                      paddingTop: '16px',
                      borderTop: '2px solid var(--border-soft)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '700' }}>
                        BY LITTLE LOCALS
                      </span>
                      <Link 
                        to={`/blog/${post.id}`} 
                        style={{ 
                          width: '40px', 
                          height: '40px', 
                          borderRadius: '50%', 
                          backgroundColor: 'var(--primary-soft)',
                          border: '2px solid var(--text-dark)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--primary)',
                          transition: 'var(--transition-bouncy)',
                          cursor: 'pointer'
                        }}
                        className="blog-card-link-arrow"
                      >
                        <ArrowUpRight size={18} />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* Styled Micro-animations and hover transitions inside page styles */}
      <style>{`
        .sticker-blog-card {
          transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.25s ease !important;
        }
        .sticker-blog-card:hover {
          transform: translate(-4px, -4px) rotate(0deg) scale(1.02) !important;
          box-shadow: 10px 10px 0px 0px var(--text-dark) !important;
        }
        .category-chip-btn:hover {
          transform: translateY(-3px);
          box-shadow: 4px 4px 0px 0px var(--text-dark) !important;
        }
        .blog-card-link-arrow:hover {
          background-color: var(--secondary) !important;
          color: white !important;
          transform: scale(1.1) rotate(15deg);
        }
        .btn-featured-story:hover {
          transform: translate(-2px, -2px);
          box-shadow: 6px 6px 0px 0px var(--text-dark) !important;
        }
        @media (max-width: 768px) {
          .event-grid-featured {
            grid-template-columns: 1fr !important;
          }
          h1 {
            font-size: 2.2rem !important;
          }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

    </div>
  );
}

