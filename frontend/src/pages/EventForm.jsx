import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Save, ArrowLeft, Image, Sparkles, AlertCircle } from 'lucide-react';

export default function EventForm() {
  const { id } = useParams(); // exists if editing
  const isEditMode = !!id;
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    description: '',
    image_url: '',
    price: 'FREE', // always FREE
    link: '',
    category: 'Playground',
    age_group: 'All Ages'
  });

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditMode);
  const [error, setError] = useState('');

  const categories = ['Playground', 'Library', 'Art & Craft', 'Outdoors', 'Sports', 'Music & Storytime'];
  const ageGroups = ['All Ages', '0-5 years', '6-12 years', 'Teens'];

  // Route protection
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/admin/login');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Load existing event data if in edit mode
  useEffect(() => {
    if (!isEditMode) return;

    async function loadEvent() {
      try {
        const docRef = doc(db, 'events', id);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          const data = snapshot.data();
          setForm({
            title: data.title || '',
            date: data.date || '',
            time: data.time || '',
            location: data.location || '',
            description: data.description || '',
            image_url: data.image_url || '',
            price: 'FREE',
            link: data.link || '',
            category: data.category || 'Playground',
            age_group: data.age_group || 'All Ages'
          });
        } else {
          setError('Event not found.');
        }
      } catch (err) {
        console.error("Error loading event:", err);
        setError('Error loading event: ' + err.message);
      } finally {
        setFetching(false);
      }
    }
    loadEvent();
  }, [id, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSuggestImage = () => {
    // Generate lovely Unsplash image queries based on categories
    let query = 'playground-kids';
    if (form.category === 'Library') query = 'kids-reading-books';
    if (form.category === 'Art & Craft') query = 'kids-painting-crafts';
    if (form.category === 'Outdoors') query = 'kids-park-nature';
    if (form.category === 'Sports') query = 'kids-playing-sports';
    if (form.category === 'Music & Storytime') query = 'kids-singing-storytelling';

    const randomId = Math.floor(Math.random() * 1000);
    const suggestedUrl = `https://images.unsplash.com/photo-${randomId === 0 ? '1596464716127' : '1502082553048'}-f2a82984de30?auto=format&fit=crop&w=800&q=80&sig=${randomId}&q=${query}`;
    
    // Instead of random hash signature, provide nice high-quality stock kids assets
    const assets = {
      'Playground': 'https://images.unsplash.com/photo-1596464716127-f2a82984de30?auto=format&fit=crop&w=800&q=80',
      'Library': 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
      'Art & Craft': 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=800&q=80',
      'Outdoors': 'https://images.unsplash.com/photo-1502082553048-f2a82984de30?auto=format&fit=crop&w=800&q=80',
      'Sports': 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=800&q=80',
      'Music & Storytime': 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80'
    };

    setForm(prev => ({ ...prev, image_url: assets[form.category] || assets['Playground'] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.date || !form.location) {
      setError('Please fill in the Title, Date, and Location fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isEditMode) {
        const docRef = doc(db, 'events', id);
        await updateDoc(docRef, form);
      } else {
        const colRef = collection(db, 'events');
        await addDoc(colRef, form);
      }
      navigate('/admin/dashboard');
    } catch (err) {
      console.error("Error saving event:", err);
      setError('Failed to save event: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <p style={{ fontWeight: '700', color: 'var(--text-muted)' }}>Loading event data...</p>
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
          {isEditMode ? 'Edit Activity Details' : 'Create Free Local Activity'}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '32px' }}>
          Fill in the details below. All listings are automatically set as 100% Free.
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
            <label className="form-label" htmlFor="title">Activity Title *</label>
            <input 
              type="text" 
              id="title" 
              name="title"
              placeholder="e.g. Bateau Bay Playground Playgroup" 
              className="form-control"
              value={form.title}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          {/* Date & Time */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="date">Scheduled Date *</label>
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
              <label className="form-label" htmlFor="time">Scheduled Time</label>
              <input 
                type="text" 
                id="time" 
                name="time"
                placeholder="e.g. 10:00 AM - 12:00 PM" 
                className="form-control"
                value={form.time}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          </div>

          {/* Location */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="location">Address / Location *</label>
            <input 
              type="text" 
              id="location" 
              name="location"
              placeholder="e.g. Kibble Park, Gosford NSW 2250" 
              className="form-control"
              value={form.location}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          {/* Category & Age suitability */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="category">Activity Category</label>
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

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="age_group">Age Suitability</label>
              <select 
                id="age_group" 
                name="age_group" 
                className="form-control"
                value={form.age_group}
                onChange={handleChange}
                disabled={loading}
              >
                {ageGroups.map(age => (
                  <option key={age} value={age}>{age}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Image URL with auto suggestion */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="image_url">Thumbnail Image URL</label>
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
              Provide an image URL or click Auto-Suggest to generate a beautiful kid stock photo based on she's selected category.
            </span>
          </div>

          {/* Website Link */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="link">Registration / Information Link</label>
            <input 
              type="url" 
              id="link" 
              name="link"
              placeholder="e.g. https://www.centralcoast.nsw.gov.au/whats-on/..." 
              className="form-control"
              value={form.link}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          {/* Description */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="description">Activity Details & Review</label>
            <textarea 
              id="description" 
              name="description"
              placeholder="Provide a detailed review or summary of the free activity, where to park, shade options, and play facilities..." 
              className="form-control"
              value={form.description}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          {/* Save Button */}
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '16px', gap: '10px', marginTop: '16px' }}
            disabled={loading}
          >
            <Save size={20} /> {loading ? 'Saving Activity...' : 'Save and Publish'}
          </button>

        </form>

      </div>

    </div>
  );
}
