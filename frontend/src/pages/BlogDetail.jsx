import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ArrowLeft, Clock, Calendar, Bookmark, Share2, ClipboardCheck, Smile } from 'lucide-react';

export default function BlogDetail() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeImage, setActiveImage] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAdmin(!!user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function fetchPost() {
      try {
        const docRef = doc(db, 'posts', id);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          setPost({ id: snapshot.id, ...snapshot.data() });
        }
      } catch (error) {
        console.error("Error fetching blog post details:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchPost();
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
        <p style={{ fontWeight: '700', color: 'var(--text-muted)' }}>Loading article...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!post || post.is_published === false) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px' }}>
        <Smile size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
        <h3 style={{ fontWeight: 800, marginBottom: '8px' }}>Article not found</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>The blog post might have been drafted or removed.</p>
        <Link to="/blog" className="btn btn-primary">Back to Blog</Link>
      </div>
    );
  }

  // Calculate reading time
  const words = post.content?.split(/\s+/).length || 0;
  const readTime = Math.max(1, Math.ceil(words / 200));

  // Generate Facebook share text
  const getFormattedFacebookPost = () => {
    return `📝 NEW BLOG REVIEW from Little Locals Central Coast! 📝

"${post.title}"

✨ Category: ${post.category || 'Review'}
📖 ${post.excerpt || post.content?.slice(0, 150) + '...'}

Read the full review and guide here: https://littlelocals.au/blog/${post.id}`;
  };

  const handleCopyToClipboard = () => {
    const postText = getFormattedFacebookPost();
    navigator.clipboard.writeText(postText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  return (
    <div className="detail-page-container" style={{ 
      maxWidth: '900px', 
      margin: '0 auto',
      backgroundColor: 'var(--bg-cream)',
      minHeight: '100vh'
    }}>
      
      {/* Back Navigation */}
      <Link 
        to="/blog" 
        style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '10px', 
          color: 'var(--primary)', 
          fontWeight: '800', 
          marginBottom: '32px',
          textTransform: 'uppercase',
          fontSize: '0.85rem',
          letterSpacing: '0.05em',
          padding: '8px 18px',
          border: '3.5px solid var(--text-dark)',
          borderRadius: '50px',
          backgroundColor: 'var(--bg-white)',
          boxShadow: '3px 3px 0px 0px var(--text-dark)',
          transition: 'var(--transition-bouncy)'
        }}
        className="back-btn"
      >
        <ArrowLeft size={16} /> Back to Blog
      </Link>

      <article className="article-card">
        {/* Cover image */}
        <div className="detail-cover-image" style={{ 
          borderBottom: '3.5px solid var(--text-dark)'
        }}>
          <img 
            src={post.image_url || 'https://images.unsplash.com/photo-1502082553048-f2a82984de30?auto=format&fit=crop&w=1000&q=80'} 
            alt={post.title} 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
          
          {/* Category Chip Badge */}
          <div style={{ position: 'absolute', top: '24px', left: '24px' }}>
            <span style={{ 
              backgroundColor: 'var(--secondary)', 
              color: 'white', 
              padding: '8px 20px', 
              borderRadius: '50px', 
              fontWeight: '900', 
              fontSize: '0.85rem', 
              border: '2.5px solid var(--text-dark)',
              boxShadow: '3px 3px 0px 0px var(--text-dark)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              {post.category || 'Review'}
            </span>
          </div>
        </div>

        <div className="article-body-padding">
          
          {/* Metadata bar */}
          <div style={{ 
            display: 'flex', 
            gap: '24px', 
            fontSize: '0.85rem', 
            color: 'var(--text-muted)', 
            marginBottom: '28px', 
            fontWeight: '700',
            flexWrap: 'wrap',
            borderBottom: '2px dashed var(--border-soft)',
            paddingBottom: '20px'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={15} style={{ color: 'var(--secondary)' }} /> {post.date && !isNaN(new Date(post.date).getTime()) ? new Date(post.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Flexible'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={15} style={{ color: 'var(--secondary)' }} /> {readTime} min read
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Bookmark size={15} style={{ color: 'var(--secondary)' }} /> Written by Little Locals
            </span>
          </div>

          <h1 style={{ 
            fontFamily: 'var(--font-display)',
            fontWeight: 900, 
            fontSize: 'clamp(1.8rem, 5.5vw, 2.8rem)', 
            marginBottom: '28px', 
            textAlign: 'left', 
            lineHeight: 1.15, 
            color: 'var(--primary)',
            letterSpacing: '-0.02em'
          }}>
            {post.title}
          </h1>

          {/* Excerpt panel */}
          {post.excerpt && (
            <div className="blog-excerpt">
              "{post.excerpt}"
            </div>
          )}

          {/* Content Body */}
          <div className="blog-content-paragraphs" style={{ 
            textAlign: 'left', 
            fontSize: '1.12rem', 
            color: 'var(--text-dark)', 
            lineHeight: '1.85', 
            fontFamily: 'var(--font-sans)'
          }}>
            {post.content?.split('\n').map((para, i) => {
              if (!para.trim()) return <div key={i} style={{ height: '14px' }} />;
              return (
                <p key={i} style={{ marginBottom: '20px' }}>
                  {para}
                </p>
              );
            })}
          </div>

          {/* Adventure Photos Gallery */}
          {post.image_urls && post.image_urls.length > 0 && (
            <div className="adventure-gallery-section" style={{ marginTop: '40px', paddingTop: '32px', borderTop: '2px dashed var(--border-soft)' }}>
              <h3 style={{ 
                fontFamily: 'var(--font-display)', 
                fontWeight: 900, 
                color: 'var(--primary)', 
                fontSize: '1.4rem', 
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                📸 Adventure Photo Gallery
              </h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
                gap: '20px' 
              }}>
                {post.image_urls.map((url, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setActiveImage(url)}
                    className="gallery-thumbnail-card"
                    style={{ 
                      position: 'relative',
                      borderRadius: '16px', 
                      border: '3px solid var(--text-dark)', 
                      overflow: 'hidden',
                      aspectRatio: '1 / 1',
                      boxShadow: '4px 4px 0px 0px var(--text-dark)',
                      cursor: 'pointer',
                      backgroundColor: 'var(--bg-white)',
                      transition: 'var(--transition-bouncy)'
                    }}
                  >
                    <img 
                      src={url} 
                      alt={`Gallery view ${idx + 1}`} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} 
                    />
                    <div className="gallery-thumbnail-overlay" style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(3, 63, 29, 0.15)',
                      opacity: 0,
                      transition: 'opacity 0.25s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <span style={{ 
                        color: 'white', 
                        fontWeight: '900', 
                        backgroundColor: 'var(--text-dark)', 
                        padding: '6px 12px', 
                        borderRadius: '50px',
                        fontSize: '0.75rem',
                        border: '2px solid white'
                      }}>
                        VIEW PHOTO
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </article>

      {/* Facebook Blog Sharing Helper (Admin Assistant Tool) */}
      {isAdmin && (
        <div className="admin-sharing-helper article-card" style={{ marginTop: '48px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: '50%', 
              backgroundColor: 'var(--primary)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: 'white',
              border: '2px solid var(--text-dark)',
              boxShadow: '2.5px 2.5px 0px 0px var(--text-dark)'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </div>
            <div>
              <h3 style={{ 
                fontFamily: 'var(--font-display)',
                fontWeight: 900, 
                color: 'var(--primary)',
                fontSize: '1.25rem',
                margin: 0
              }}>
                Admin Blog Sharing Assistant
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 0 0', fontWeight: '600' }}>
                Copy a preformatted article review post and share directly to the Little Locals Facebook page!
              </p>
            </div>
          </div>

          <div style={{ 
            backgroundColor: 'var(--bg-cream)', 
            padding: '24px', 
            borderRadius: '16px', 
            border: '2px solid var(--text-dark)',
            fontFamily: 'monospace',
            fontSize: '0.88rem',
            lineHeight: '1.5',
            whiteSpace: 'pre-wrap',
            maxHeight: '220px',
            overflowY: 'auto',
            marginBottom: '24px',
            color: 'var(--text-dark)',
            wordBreak: 'break-all',
            overflowWrap: 'anywhere'
          }}>
            {getFormattedFacebookPost()}
          </div>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <button 
              onClick={handleCopyToClipboard}
              style={{ 
                padding: '14px 28px',
                borderRadius: '50px',
                border: '3px solid var(--text-dark)',
                backgroundColor: copied ? 'var(--primary)' : 'var(--secondary)',
                color: 'white',
                fontWeight: '800',
                fontSize: '0.95rem',
                cursor: 'pointer',
                boxShadow: '3px 3px 0px 0px var(--text-dark)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'var(--transition-bouncy)'
              }}
              className="copy-caption-btn copy-btn"
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
              style={{ 
                padding: '14px 28px',
                borderRadius: '50px',
                border: '3px solid var(--text-dark)',
                backgroundColor: 'var(--bg-white)',
                color: 'var(--text-dark)',
                fontWeight: '800',
                fontSize: '0.95rem',
                cursor: 'pointer',
                boxShadow: '3px 3px 0px 0px var(--text-dark)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'var(--transition-bouncy)'
              }}
              className="open-facebook-btn"
            >
              Open Facebook
            </a>
          </div>
        </div>
      )}

      {/* Lightbox / Photo Viewer Modal */}
      {activeImage && (
        <div 
          onClick={() => setActiveImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(28, 27, 27, 0.95)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            cursor: 'zoom-out',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          {/* Close button */}
          <button 
            onClick={() => setActiveImage(null)}
            style={{
              position: 'absolute',
              top: '24px',
              right: '24px',
              background: 'var(--bg-white)',
              border: '3px solid var(--text-dark)',
              color: 'var(--text-dark)',
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              fontSize: '20px',
              fontWeight: '900',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '3px 3px 0px 0px var(--text-dark)',
              zIndex: 100000,
              transition: 'var(--transition-bouncy)'
            }}
            className="lightbox-close"
          >
            ✕
          </button>
          
          <img 
            src={activeImage} 
            alt="Enlarged gallery view" 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              maxWidth: '100%', 
              maxHeight: '90vh', 
              objectFit: 'contain', 
              borderRadius: '16px', 
              border: '4px solid var(--text-dark)',
              boxShadow: '8px 8px 0px 0px var(--text-dark)',
              backgroundColor: 'var(--bg-white)',
              cursor: 'default'
            }} 
          />
        </div>
      )}

      {/* Retro styles */}
      <style>{`
        .back-btn:hover {
          transform: translate(-3px, -3px);
          box-shadow: 6px 6px 0px 0px var(--text-dark) !important;
          background-color: var(--primary-soft) !important;
        }
        .copy-caption-btn:hover, .open-facebook-btn:hover {
          transform: translate(-3px, -3px);
          box-shadow: 6px 6px 0px 0px var(--text-dark) !important;
        }
        .blog-content-paragraphs p {
          margin-bottom: 24px;
        }
        .gallery-thumbnail-card:hover {
          transform: translate(-4px, -4px);
          box-shadow: 8px 8px 0px 0px var(--text-dark) !important;
        }
        .gallery-thumbnail-card:hover .gallery-thumbnail-overlay {
          opacity: 1 !important;
        }
        .lightbox-close:hover {
          transform: scale(1.1);
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @media (max-width: 768px) {
          .article-body-padding {
            padding: 24px 20px !important;
          }
          h1 {
            font-size: 2rem !important;
          }
        }
      `}</style>

    </div>
  );
}
