import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ArrowLeft, Clock, Calendar, Bookmark, Share2, ClipboardCheck, Smile } from 'lucide-react';

export default function BlogDetail() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

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
    <div style={{ padding: '40px 20px', maxWidth: '840px', margin: '0 auto' }}>
      
      {/* Back Navigation */}
      <Link to="/blog" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '24px' }}>
        <ArrowLeft size={16} /> Back to Blog
      </Link>

      <article style={{ 
        backgroundColor: 'var(--bg-white)', 
        borderRadius: 'var(--radius-lg)', 
        border: '1px solid var(--border-soft)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-light)',
        marginBottom: '32px'
      }}>
        {/* Cover image */}
        <div style={{ height: '340px', width: '100%', position: 'relative' }}>
          <img 
            src={post.image_url || 'https://images.unsplash.com/photo-1502082553048-f2a82984de30?auto=format&fit=crop&w=1000&q=80'} 
            alt={post.title} 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
          <div style={{ position: 'absolute', top: '20px', left: '20px', backgroundColor: 'var(--secondary)', color: 'white', padding: '6px 16px', borderRadius: '50px', fontWeight: '900', fontSize: '0.8rem', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
            {post.category || 'Review'}
          </div>
        </div>

        <div style={{ padding: '40px 50px' }}>
          
          {/* Metadata bar */}
          <div style={{ display: 'flex', gap: '20px', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px', fontWeight: '600' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} /> {post.date ? new Date(post.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Flexible'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} /> {readTime} min read
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Bookmark size={14} /> Written by Little Locals
            </span>
          </div>

          <h1 style={{ fontWeight: 900, fontSize: '2.4rem', marginBottom: '28px', textAlign: 'left', lineHeight: 1.2, color: 'var(--text-dark)' }}>
            {post.title}
          </h1>

          {/* Excerpt panel */}
          {post.excerpt && (
            <div style={{ 
              padding: '20px 24px', 
              backgroundColor: 'var(--bg-cream)', 
              borderRadius: 'var(--radius-md)', 
              borderLeft: '4px solid var(--primary)', 
              fontSize: '1.05rem', 
              fontWeight: '600', 
              color: 'var(--text-dark)', 
              marginBottom: '32px',
              textAlign: 'left',
              lineHeight: 1.5
            }}>
              {post.excerpt}
            </div>
          )}

          {/* Content Body */}
          <div style={{ 
            textAlign: 'left', 
            fontSize: '1.1rem', 
            color: 'var(--text-dark)', 
            lineHeight: '1.8', 
            whiteSpace: 'pre-line',
            marginBottom: '40px' 
          }}>
            {post.content}
          </div>

        </div>
      </article>

      {/* Facebook Blog Sharing Helper (Admin Assistant Tool) */}
      <div style={{ 
        backgroundColor: 'var(--primary-soft)', 
        borderRadius: 'var(--radius-lg)', 
        border: '1px dashed var(--primary)',
        padding: '32px',
        textAlign: 'left',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
          </div>
          <div>
            <h3 style={{ fontWeight: 900, color: 'var(--text-dark)' }}>Admin Blog Sharing Assistant</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Copy a preformatted article review post and share directly to the Little Locals Facebook page!</p>
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
          maxHeight: '200px',
          overflowY: 'auto',
          marginBottom: '20px',
          color: 'var(--text-dark)'
        }}>
          {getFormattedFacebookPost()}
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button 
            className={`btn ${copied ? 'btn-secondary' : 'btn-primary'}`} 
            onClick={handleCopyToClipboard}
            style={{ minWidth: '240px' }}
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

    </div>
  );
}
