import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Save, ArrowLeft, Image, Sparkles, AlertCircle } from 'lucide-react';

export default function BlogForm() {
  const { id } = useParams(); // exists if editing
  const isEditMode = !!id;
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '',
    excerpt: '',
    category: 'Review',
    image_url: '',
    content: '',
    date: new Date().toISOString().split('T')[0], // default to today
    is_published: true
  });

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditMode);
  const [error, setError] = useState('');

  const categories = ['Review', 'Parenting Guide', 'School Holidays', 'Tips & Hacks'];

  // Route protection
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/admin/login');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Load existing post data if in edit mode
  useEffect(() => {
    if (!isEditMode) return;

    async function loadPost() {
      try {
        const docRef = doc(db, 'posts', id);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          const data = snapshot.data();
          setForm({
            title: data.title || '',
            excerpt: data.excerpt || '',
            category: data.category || 'Review',
            image_url: data.image_url || '',
            content: data.content || '',
            date: data.date || new Date().toISOString().split('T')[0],
            is_published: data.is_published !== undefined ? data.is_published : true
          });
        } else {
          setError('Article not found.');
        }
      } catch (err) {
        console.error("Error loading blog post:", err);
        setError('Error loading blog post: ' + err.message);
      } finally {
        setFetching(false);
      }
    }
    loadPost();
  }, [id, isEditMode]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleSuggestImage = () => {
    // Generate children photos matching the category
    const assets = {
      'Review': 'https://images.unsplash.com/photo-1502082553048-f2a82984de30?auto=format&fit=crop&w=800&q=80',
      'Parenting Guide': 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
      'School Holidays': 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=800&q=80',
      'Tips & Hacks': 'https://images.unsplash.com/photo-1596464716127-f2a82984de30?auto=format&fit=crop&w=800&q=80'
    };

    setForm(prev => ({ ...prev, image_url: assets[form.category] || assets['Review'] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.content) {
      setError('Please fill in the Title and Content fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isEditMode) {
        const docRef = doc(db, 'posts', id);
        await updateDoc(docRef, form);
      } else {
        const colRef = collection(db, 'posts');
        await addDoc(colRef, form);
      }
      navigate('/admin/dashboard');
    } catch (err) {
      console.error("Error saving blog post:", err);
      setError('Failed to save blog post: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <p style={{ fontWeight: '700', color: 'var(--text-muted)' }}>Loading article data...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto' }}>
      
      {/* Navigation */}
      <Link to="/admin/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '24px' }}>
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <div style={{ 
        backgroundColor: 'var(--bg-white)', 
        borderRadius: 'var(--radius-lg)', 
        padding: '40px', 
        border: '1px solid var(--border-soft)',
        boxShadow: 'var(--shadow-light)',
        textAlign: 'left'
      }}>
        
        <h2 style={{ fontWeight: 900, marginBottom: '8px' }}>
          {isEditMode ? 'Edit Blog Post' : 'Write New Blog Post'}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '32px' }}>
          Write honest, detailed playground reviews or parenting guides for Little Locals.
        </p>

        {error && (
          <div style={{ 
            display: 'flex', 
            gap: '8px', 
            alignItems: 'center', 
            backgroundColor: 'hsl(0, 100%, 97%)', 
            border: '1px solid hsl(0, 100%, 85%)', 
            padding: '12px 16px', 
            borderRadius: 'var(--radius-sm)', 
            color: 'hsl(0, 80%, 40%)', 
            fontSize: '0.85rem',
            marginBottom: '28px'
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          
          {/* Title */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="title">Article Title *</label>
            <input 
              type="text" 
              id="title" 
              name="title"
              placeholder="e.g. Umina Beach Playground Review" 
              className="form-control"
              value={form.title}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          {/* Date & Category */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="date">Publication Date *</label>
              <input 
                type="date" 
                id="date" 
                name="date"
                className="form-control"
                value={form.date}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="category">Article Category</label>
              <select 
                id="category" 
                name="category" 
                className="form-control"
                value={form.category}
                onChange={handleChange}
                disabled={loading}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Featured Image URL with auto suggestion */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="image_url">Featured Image URL</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ position: 'relative', flexGrow: 1 }}>
                <Image style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                <input 
                  type="url" 
                  id="image_url" 
                  name="image_url"
                  placeholder="https://images.unsplash.com/..." 
                  className="form-control"
                  style={{ paddingLeft: '48px' }}
                  value={form.image_url}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
              <button 
                type="button" 
                className="btn btn-outline" 
                style={{ padding: '0 20px', gap: '6px', whiteSpace: 'nowrap' }} 
                onClick={handleSuggestImage}
              >
                <Sparkles size={16} style={{ color: 'var(--primary)' }} /> Auto-Suggest
              </button>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Provide an image URL or click Auto-Suggest to generate a beautiful stock photo matching the selected category.
            </span>
          </div>

          {/* Excerpt */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="excerpt">Excerpt / Summary</label>
            <input 
              type="text" 
              id="excerpt" 
              name="excerpt"
              placeholder="e.g. A gorgeous, fully fenced playground right on the beachfront featuring massive slides and a cafe nearby." 
              className="form-control"
              value={form.excerpt}
              onChange={handleChange}
              disabled={loading}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              A short description shown on the blog list page.
            </span>
          </div>

          {/* Content Body */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="content">Article Content *</label>
            <textarea 
              id="content" 
              name="content"
              placeholder="Write she's detailed review or guide here. Use spaces and paragraphs freely to format she's layout..." 
              className="form-control"
              style={{ minHeight: '300px' }}
              value={form.content}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          {/* Publish Checkbox */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '8px 0' }}>
            <input 
              type="checkbox" 
              id="is_published" 
              name="is_published"
              style={{ width: '20px', height: '20px', accentColor: 'var(--primary)', cursor: 'pointer' }}
              checked={form.is_published}
              onChange={handleChange}
              disabled={loading}
            />
            <label htmlFor="is_published" style={{ fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer', color: 'var(--text-dark)' }}>
              Publish immediately (makes post visible to the public)
            </label>
          </div>

          {/* Save Button */}
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '16px', gap: '10px', marginTop: '16px' }}
            disabled={loading}
          >
            <Save size={20} /> {loading ? 'Saving Post...' : 'Save and Publish'}
          </button>

        </form>

      </div>

    </div>
  );
}
