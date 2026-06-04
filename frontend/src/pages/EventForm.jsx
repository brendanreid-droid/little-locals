import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db, auth, storage } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
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
    age_group: 'All Ages',
    is_featured: false
  });

  const [shareToFacebook, setShareToFacebook] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditMode);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
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
            age_group: data.age_group || 'All Ages',
            is_featured: data.is_featured || false
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
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    setError('');

    const storageRef = ref(storage, `event_images/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        setUploadProgress(progress);
      },
      (err) => {
        console.error("Storage upload error:", err);
        setUploading(false);
        if (err.code === 'storage/unauthorized') {
          setError('Failed to upload image: Permission denied. Ensure Cloud Storage is set up in your Firebase Console.');
        } else {
          setError(`Failed to upload image: ${err.message}. Please activate Storage in your console.`);
        }
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          setForm((prev) => ({ ...prev, image_url: downloadUrl }));
        } catch (err) {
          setError('Error getting download URL: ' + err.message);
        } finally {
          setUploading(false);
        }
      }
    );
  };

  const handleSuggestImage = () => {
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

  // Generate Facebook share text
  const getFormattedFacebookPost = (eventId) => {
    const dateFormatted = form.date 
      ? new Date(form.date).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : 'Flexible Date';
    
    return `🎒 FREE CENTRAL COAST KIDS ACTIVITY! 🎒

Discover: ${form.title}

📅 Date: ${dateFormatted}
⏰ Time: ${form.time || 'Flexible / Check listing'}
📍 Location: ${form.location}
👶 Age Suitability: ${form.age_group || 'All Ages'}

${form.description || ''}

✨ Find more 100% free family events and reviews at: https://littlelocals.au/events/${eventId}`;
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
      let eventId = id;
      
      if (isEditMode) {
        const docRef = doc(db, 'events', id);
        await updateDoc(docRef, form);
      } else {
        const colRef = collection(db, 'events');
        const docAdded = await addDoc(colRef, form);
        eventId = docAdded.id;
      }

      // Clear any suggestions in the review queue that match the saved event's title and date
      try {
        const suggestionsCol = collection(db, 'suggestions');
        const suggestionSnapshot = await getDocs(suggestionsCol);
        const matchingSuggestions = suggestionSnapshot.docs.filter(doc => {
          const data = doc.data();
          return data.title?.toLowerCase() === form.title?.toLowerCase() && data.date === form.date;
        });
        for (const sugDoc of matchingSuggestions) {
          await deleteDoc(doc(db, 'suggestions', sugDoc.id));
        }
      } catch (cleanErr) {
        console.error("Error clearing matching suggestion:", cleanErr);
      }

      // If checked, post directly to Facebook via Vercel serverless function
      if (shareToFacebook) {
        try {
          const fbMessage = getFormattedFacebookPost(eventId);
          const response = await fetch('/api/post-to-facebook', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: fbMessage,
              link: `https://littlelocals.au/events/${eventId}`,
              image_url: form.image_url
            })
          });

          const fbData = await response.json();
          if (!response.ok) {
            alert(`Listing saved successfully! However, direct Facebook posting failed: ${fbData.error || 'Server error'}. You can still copy the caption manually from the event details page!`);
          } else {
            alert("Listing saved and successfully shared directly to your Facebook Page! 🎉");
          }
        } catch (fbErr) {
          console.error("Facebook post catch error:", fbErr);
          alert("Listing saved successfully, but direct Facebook post failed due to a connection error. You can still share it manually!");
        }
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
    <div className="form-page-container">
      
      {/* Navigation */}
      <Link to="/admin/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '24px' }}>
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <div className="form-card">
        
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
              disabled={loading || uploading}
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
                disabled={loading || uploading}
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
                disabled={loading || uploading}
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
              disabled={loading || uploading}
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
                disabled={loading || uploading}
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
                disabled={loading || uploading}
              >
                {ageGroups.map(age => (
                  <option key={age} value={age}>{age}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Image Uploader & URL selector */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Activity Image / Photo</label>
            
            {/* File Upload Selector */}
            <div style={{ marginBottom: '12px', padding: '16px', border: '2px dashed var(--border-soft)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-cream)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-dark)' }}>Upload Image from Device</span>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileUpload} 
                disabled={loading || uploading} 
                style={{ fontSize: '0.9rem' }}
              />
              {uploading && (
                <div style={{ marginTop: '6px' }}>
                  <div style={{ height: '8px', width: '100%', backgroundColor: 'var(--border-soft)', borderRadius: '50px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${uploadProgress}%`, backgroundColor: 'var(--teal)', transition: 'width 0.2s ease' }} />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                    Uploading to Firebase Storage... {uploadProgress}%
                  </span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', margin: '8px 0', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700' }}>
              <div style={{ height: '1px', flexGrow: 1, backgroundColor: 'var(--border-soft)' }} />
              <span>OR USE IMAGE URL</span>
              <div style={{ height: '1px', flexGrow: 1, backgroundColor: 'var(--border-soft)' }} />
            </div>

            {/* Input URL */}
            <div className="manual-image-row">
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
                  disabled={loading || uploading}
                />
              </div>
              <button 
                type="button" 
                className="btn btn-outline" 
                style={{ padding: '0 20px', gap: '6px', whiteSpace: 'nowrap' }} 
                onClick={handleSuggestImage}
                disabled={loading || uploading}
              >
                <Sparkles size={16} style={{ color: 'var(--primary)' }} /> Auto-Suggest
              </button>
            </div>
            
            {form.image_url && (
              <div style={{ marginTop: '12px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Image Preview:</span>
                <img 
                  src={form.image_url} 
                  alt="Preview" 
                  style={{ width: '120px', height: '80px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-soft)' }} 
                />
              </div>
            )}
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
              disabled={loading || uploading}
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
              disabled={loading || uploading}
            />
          </div>

          {/* Direct Facebook Page share trigger */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            padding: '16px 20px', 
            borderRadius: 'var(--radius-md)', 
            backgroundColor: 'var(--secondary-soft)', 
            border: '1px solid var(--border-soft)', 
            margin: '8px 0' 
          }}>
            <input 
              type="checkbox" 
              id="share_to_facebook" 
              style={{ width: '20px', height: '20px', accentColor: 'var(--secondary)', cursor: 'pointer' }}
              checked={shareToFacebook}
              onChange={(e) => setShareToFacebook(e.target.checked)}
              disabled={loading || uploading}
            />
            <label htmlFor="share_to_facebook" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', fontSize: '0.9rem', color: 'var(--text-dark)', cursor: 'pointer' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--secondary)"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              Share directly to Little Locals Facebook Page
            </label>
          </div>

          {/* Flag as Featured Event */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            padding: '16px 20px', 
            borderRadius: 'var(--radius-md)', 
            backgroundColor: 'var(--primary-soft)', 
            border: '1px solid var(--border-soft)', 
            margin: '8px 0' 
          }}>
            <input 
              type="checkbox" 
              id="is_featured" 
              name="is_featured"
              style={{ width: '20px', height: '20px', accentColor: 'var(--primary)', cursor: 'pointer' }}
              checked={form.is_featured}
              onChange={handleChange}
              disabled={loading || uploading}
            />
            <label htmlFor="is_featured" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', fontSize: '0.9rem', color: 'var(--text-dark)', cursor: 'pointer' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '20px' }}>grade</span>
              Flag as Featured Event (Highlights at the top of the homepage)
            </label>
          </div>

          {/* Save Button */}
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '16px', gap: '10px', marginTop: '16px' }}
            disabled={loading || uploading}
          >
            <Save size={20} /> {loading ? 'Saving Activity...' : 'Save and Publish'}
          </button>

        </form>

      </div>

    </div>
  );
}
