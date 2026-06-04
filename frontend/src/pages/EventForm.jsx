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
    category: 'Playgrounds',
    age_group: 'All Ages',
    is_featured: false,
    is_recurring: false,
    recurrence_type: 'weekly',
    recurrence_until: '',
    recurring_id: ''
  });

  const [shareToFacebook, setShareToFacebook] = useState(false);
  const [applyToSeries, setApplyToSeries] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditMode);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');

  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [mediaLibrary, setMediaLibrary] = useState([]);
  const [loadingMedia, setLoadingMedia] = useState(false);

  const categories = ['School Holidays', 'Weekend Activities', 'Weekday Activities', 'Markets', 'Playgrounds', 'Indoor Activities', 'Playgroups'];
  const ageGroups = ['All Ages', '0-5 years', '6-12 years', 'Teens'];
  const timeOptions = [
    'Flexible',
    '12:00 AM', '12:30 AM', '1:00 AM', '1:30 AM', '2:00 AM', '2:30 AM', '3:00 AM', '3:30 AM', '4:00 AM', '4:30 AM', '5:00 AM', '5:30 AM',
    '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM', '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
    '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM', '10:30 PM', '11:00 PM', '11:30 PM'
  ];

  // Parse start and end time from form.time
  const getParsedTimes = () => {
    let start = 'Flexible';
    let end = 'Flexible';
    if (form.time) {
      if (form.time.includes(' - ')) {
        const parts = form.time.split(' - ');
        start = parts[0];
        end = parts[1];
      } else {
        start = form.time;
        end = 'Flexible';
      }
    }
    return { start, end };
  };

  const getSelectOptions = (val) => {
    if (val && !timeOptions.includes(val)) {
      return [val, ...timeOptions];
    }
    return timeOptions;
  };

  const handleTimeChange = (type, val) => {
    const { start, end } = getParsedTimes();
    let newStart = type === 'start' ? val : start;
    let newEnd = type === 'end' ? val : end;

    let combined = '';
    if (newStart === 'Flexible' && newEnd === 'Flexible') {
      combined = 'Flexible';
    } else if (newEnd && newEnd !== 'Flexible') {
      combined = `${newStart} - ${newEnd}`;
    } else {
      combined = newStart;
    }

    setForm(prev => ({ ...prev, time: combined }));
  };

  const { start: startTime, end: endTime } = getParsedTimes();
  const startOptions = getSelectOptions(startTime);
  const endOptions = getSelectOptions(endTime);

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
            price: data.price || 'FREE',
            link: data.link || '',
            category: data.category || 'Playgrounds',
            age_group: data.age_group || 'All Ages',
            is_featured: data.is_featured || false,
            is_recurring: data.is_recurring || false,
            recurrence_type: data.recurrence_type || 'weekly',
            recurrence_until: data.recurrence_until || '',
            recurring_id: data.recurring_id || ''
          });
        } else {
          setError('Event not found.');
        }
      } catch (err) {
        console.error("Error loading event for edit:", err);
        setError("Failed to load event data.");
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
      'School Holidays': 'https://images.unsplash.com/photo-1502082553048-f2a82984de30?auto=format&fit=crop&w=800&q=80',
      'Weekend Activities': 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=800&q=80',
      'Weekday Activities': 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
      'Markets': 'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=800&q=80',
      'Playgrounds': 'https://images.unsplash.com/photo-1596464716127-f2a82984de30?auto=format&fit=crop&w=800&q=80',
      'Indoor Activities': 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=800&q=80',
      'Playgroups': 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=800&q=80'
    };

    setForm(prev => ({ ...prev, image_url: assets[form.category] || assets['Playgrounds'] }));
  };

  const openMediaLibrary = async () => {
    setShowMediaLibrary(true);
    setLoadingMedia(true);
    try {
      const urls = new Set();
      // Fetch events
      const eventsCol = collection(db, 'events');
      const eventsSnap = await getDocs(eventsCol);
      eventsSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.image_url) urls.add(data.image_url);
      });

      // Fetch posts
      const postsCol = collection(db, 'posts');
      const postsSnap = await getDocs(postsCol);
      postsSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.image_url) urls.add(data.image_url);
        if (data.image_urls && Array.isArray(data.image_urls)) {
          data.image_urls.forEach(url => {
            if (url) urls.add(url);
          });
        }
      });

      setMediaLibrary(Array.from(urls));
    } catch (err) {
      console.error("Error loading media library:", err);
      setError("Failed to load library images.");
    } finally {
      setLoadingMedia(false);
    }
  };

  const handleSelectFromLibrary = (url) => {
    setForm(prev => ({ ...prev, image_url: url }));
    setShowMediaLibrary(false);
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
      let targetDates = [form.date];
      
      if (isEditMode) {
        const docRef = doc(db, 'events', id);
        await updateDoc(docRef, form);
        
        if (applyToSeries && form.recurring_id) {
          // Update all events with the same recurring_id where date >= form.date
          const eventsCol = collection(db, 'events');
          const snapshot = await getDocs(eventsCol);
          const futureEvents = snapshot.docs.filter(docObj => {
            const data = docObj.data();
            return data.recurring_id === form.recurring_id && data.date >= form.date && docObj.id !== id;
          });
          
          for (const docObj of futureEvents) {
            const dRef = doc(db, 'events', docObj.id);
            await updateDoc(dRef, {
              title: form.title,
              time: form.time,
              location: form.location,
              description: form.description,
              image_url: form.image_url,
              category: form.category,
              age_group: form.age_group,
              is_featured: form.is_featured,
              price: 'FREE',
              link: form.link
            });
          }
        }
      } else if (form.is_recurring) {
        if (!form.recurrence_until) {
          throw new Error("Please specify the Repeat Until Date.");
        }
        
        const startDate = new Date(form.date);
        const untilDate = new Date(form.recurrence_until);
        
        if (untilDate <= startDate) {
          throw new Error("Repeat Until Date must be after the start Date.");
        }
        
        const maxDate = new Date(startDate);
        maxDate.setMonth(maxDate.getMonth() + 6);
        if (untilDate > maxDate) {
          throw new Error("To keep performance high, a recurring series cannot repeat for more than 6 months.");
        }
        
        const dateStrings = [];
        let curr = new Date(startDate);
        
        while (curr <= untilDate) {
          dateStrings.push(curr.toISOString().split('T')[0]);
          
          if (form.recurrence_type === 'weekly') {
            curr.setDate(curr.getDate() + 7);
          } else if (form.recurrence_type === 'fortnightly') {
            curr.setDate(curr.getDate() + 14);
          } else if (form.recurrence_type === 'monthly') {
            curr.setMonth(curr.getMonth() + 1);
          } else {
            break;
          }
        }
        
        targetDates = dateStrings;
        
        const recurringId = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const colRef = collection(db, 'events');
        
        let firstEventId = '';
        for (let i = 0; i < dateStrings.length; i++) {
          const occDate = dateStrings[i];
          const docAdded = await addDoc(colRef, {
            ...form,
            date: occDate,
            recurring_id: recurringId,
            is_recurring: true
          });
          if (i === 0) {
            firstEventId = docAdded.id;
          }
        }
        eventId = firstEventId;
      } else {
        const colRef = collection(db, 'events');
        const docAdded = await addDoc(colRef, form);
        eventId = docAdded.id;
      }

      // Clear any suggestions in the review queue that match the saved event's title and dates
      try {
        const suggestionsCol = collection(db, 'suggestions');
        const suggestionSnapshot = await getDocs(suggestionsCol);
        const matchingSuggestions = suggestionSnapshot.docs.filter(doc => {
          const data = doc.data();
          return data.title?.toLowerCase() === form.title?.toLowerCase() && targetDates.includes(data.date);
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
              <label className="form-label">Time Slot</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Start Time</label>
                  <select 
                    className="form-control"
                    style={{ border: '2.5px solid var(--text-dark)', borderRadius: '12px', height: '48px', padding: '0 12px' }}
                    value={startTime}
                    onChange={(e) => handleTimeChange('start', e.target.value)}
                    disabled={loading || uploading}
                  >
                    {startOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>End Time</label>
                  <select 
                    className="form-control"
                    style={{ border: '2.5px solid var(--text-dark)', borderRadius: '12px', height: '48px', padding: '0 12px' }}
                    value={endTime}
                    onChange={(e) => handleTimeChange('end', e.target.value)}
                    disabled={loading || uploading}
                  >
                    {endOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>
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

          {/* Recurrence Setup */}
          {!isEditMode && (
            <div style={{ 
              padding: '20px', 
              borderRadius: 'var(--radius-md)', 
              border: '2.5px solid var(--text-dark)', 
              backgroundColor: 'var(--bg-cream)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              marginTop: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input 
                  type="checkbox" 
                  id="is_recurring" 
                  name="is_recurring" 
                  checked={form.is_recurring}
                  onChange={handleChange}
                  disabled={loading || uploading}
                  style={{ width: '20px', height: '20px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
                <label htmlFor="is_recurring" style={{ fontWeight: '800', fontSize: '0.95rem', color: 'var(--text-dark)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--primary)' }}>sync</span>
                  Make this a recurring event series
                </label>
              </div>

              {form.is_recurring && (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '16px',
                  paddingTop: '12px',
                  borderTop: '2px dashed var(--border-soft)'
                }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="recurrence_type">Repeat Frequency</label>
                    <select 
                      id="recurrence_type" 
                      name="recurrence_type" 
                      className="form-control"
                      value={form.recurrence_type}
                      onChange={handleChange}
                      disabled={loading || uploading}
                      style={{ border: '2.5px solid var(--text-dark)', borderRadius: '12px' }}
                    >
                      <option value="weekly">Weekly</option>
                      <option value="fortnightly">Fortnightly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="recurrence_until">Repeat Until Date</label>
                    <input 
                      type="date" 
                      id="recurrence_until" 
                      name="recurrence_until" 
                      className="form-control"
                      value={form.recurrence_until}
                      onChange={handleChange}
                      disabled={loading || uploading}
                      style={{ border: '2.5px solid var(--text-dark)', borderRadius: '12px' }}
                      required={form.is_recurring}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

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
              <button 
                type="button" 
                className="btn btn-outline" 
                style={{ padding: '0 20px', gap: '6px', whiteSpace: 'nowrap', backgroundColor: 'var(--secondary-soft)', color: 'var(--secondary)' }} 
                onClick={openMediaLibrary}
                disabled={loading || uploading}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>photo_library</span> Select from Library
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

          {/* Apply to Recurring Series Option (Edit mode only) */}
          {isEditMode && form.recurring_id && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '16px 20px', 
              borderRadius: 'var(--radius-md)', 
              backgroundColor: 'var(--yellow-soft)', 
              border: '2.5px solid var(--text-dark)', 
              boxShadow: '4px 4px 0px 0px var(--text-dark)',
              margin: '12px 0' 
            }}>
              <input 
                type="checkbox" 
                id="applyToSeries" 
                name="applyToSeries"
                style={{ width: '20px', height: '20px', accentColor: 'var(--teal)', cursor: 'pointer' }}
                checked={applyToSeries}
                onChange={(e) => setApplyToSeries(e.target.checked)}
                disabled={loading || uploading}
              />
              <label htmlFor="applyToSeries" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', fontSize: '0.9rem', color: 'var(--text-dark)', cursor: 'pointer' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--teal)', fontSize: '20px' }}>update</span>
                Apply changes to all future events in this recurring series?
              </label>
            </div>
          )}

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

      {/* Media Library Modal */}
      {showMediaLibrary && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(28, 27, 27, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div 
            className="sticker-shadow"
            style={{
              backgroundColor: 'var(--bg-white)',
              borderRadius: '24px',
              border: '3.5px solid var(--text-dark)',
              width: '100%',
              maxWidth: '650px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '8px 8px 0px 0px var(--text-dark)',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '24px',
              borderBottom: '3.5px solid var(--text-dark)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--primary-soft)'
            }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: '900', fontSize: '1.4rem', color: 'var(--primary)', margin: 0 }}>
                Select from Previous Uploads
              </h3>
              <button
                type="button"
                onClick={() => setShowMediaLibrary(false)}
                style={{
                  backgroundColor: 'white',
                  border: '2.5px solid var(--text-dark)',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontWeight: '950',
                  fontSize: '1.1rem',
                  boxShadow: '2px 2px 0px 0px var(--text-dark)'
                }}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div 
              className="custom-scrollbar"
              style={{
                padding: '24px',
                overflowY: 'auto',
                flexGrow: 1,
                backgroundColor: 'var(--bg-cream)'
              }}
            >
              {loadingMedia ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '48px 0' }}>
                  <div style={{ width: '40px', height: '40px', border: '4px solid var(--border-soft)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--text-muted)' }}>Loading uploads...</span>
                </div>
              ) : mediaLibrary.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontWeight: '700' }}>
                  No previously uploaded images found.
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: '16px'
                }}>
                  {mediaLibrary.map((url, idx) => (
                    <div 
                      key={idx}
                      onClick={() => handleSelectFromLibrary(url)}
                      style={{
                        position: 'relative',
                        aspectRatio: '4/3',
                        borderRadius: '12px',
                        border: '2.5px solid var(--text-dark)',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        boxShadow: '3px 3px 0px 0px var(--text-dark)',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      }}
                      className="group hover:scale-[1.03] hover:shadow-[5px_5px_0px_0px_var(--text-dark)]"
                    >
                      <img 
                        src={url} 
                        alt={`Library asset ${idx}`} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '3.5px solid var(--text-dark)',
              display: 'flex',
              justifyContent: 'flex-end',
              backgroundColor: 'var(--bg-white)'
            }}>
              <button
                type="button"
                onClick={() => setShowMediaLibrary(false)}
                className="btn btn-outline"
                style={{ height: '44px', padding: '0 24px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
