import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, updateDoc } from 'firebase/firestore';
import { db, auth, storage } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
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
    image_urls: [], // multiple photos array
    content: '',
    date: new Date().toISOString().split('T')[0], // default to today
    is_published: true
  });

  const [shareToFacebook, setShareToFacebook] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditMode);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFiles, setUploadingFiles] = useState([]); // track multiple file upload progress!
  const [manualImageUrl, setManualImageUrl] = useState('');
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
            image_urls: data.image_urls || [],
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

  const handleMultipleFilesUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    setError('');

    const newUploads = files.map(file => ({
      name: file.name,
      progress: 0,
      status: 'pending'
    }));
    setUploadingFiles(newUploads);

    const uploadPromises = files.map((file, index) => {
      return new Promise((resolve, reject) => {
        const storageRef = ref(storage, `blog_images/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            setUploadingFiles(prev => {
              const updated = [...prev];
              if (updated[index]) {
                updated[index].progress = progress;
                updated[index].status = 'uploading';
              }
              return updated;
            });
          },
          (err) => {
            console.error("File upload error:", err);
            setUploadingFiles(prev => {
              const updated = [...prev];
              if (updated[index]) {
                updated[index].status = 'error';
              }
              return updated;
            });
            reject(err);
          },
          async () => {
            try {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              setUploadingFiles(prev => {
                const updated = [...prev];
                if (updated[index]) {
                  updated[index].progress = 100;
                  updated[index].status = 'completed';
                }
                return updated;
              });
              resolve(downloadUrl);
            } catch (urlErr) {
              reject(urlErr);
            }
          }
        );
      });
    });

    try {
      const urls = await Promise.all(uploadPromises);
      setForm(prev => {
        const currentUrls = prev.image_urls || [];
        const updatedUrls = [...currentUrls, ...urls];
        const featured = prev.image_url ? prev.image_url : urls[0];
        return {
          ...prev,
          image_url: featured,
          image_urls: updatedUrls
        };
      });
    } catch (err) {
      console.error("Multiple upload error:", err);
      setError(`Some files failed to upload. If this keeps showing 0%, please verify that "Storage" is activated/enabled in your Firebase Console.`);
    } finally {
      setUploading(false);
      setTimeout(() => setUploadingFiles([]), 4000);
    }
  };

  const handleAddManualImage = () => {
    if (!manualImageUrl) return;
    setForm(prev => {
      const currentUrls = prev.image_urls || [];
      const updatedUrls = currentUrls.includes(manualImageUrl) ? currentUrls : [...currentUrls, manualImageUrl];
      const featured = prev.image_url ? prev.image_url : manualImageUrl;
      return {
        ...prev,
        image_url: featured,
        image_urls: updatedUrls
      };
    });
    setManualImageUrl('');
  };

  const handleSuggestImage = () => {
    const assets = {
      'Review': 'https://images.unsplash.com/photo-1502082553048-f2a82984de30?auto=format&fit=crop&w=800&q=80',
      'Parenting Guide': 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
      'School Holidays': 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=800&q=80',
      'Tips & Hacks': 'https://images.unsplash.com/photo-1596464716127-f2a82984de30?auto=format&fit=crop&w=800&q=80'
    };

    const suggestedUrl = assets[form.category] || assets['Review'];
    setForm(prev => {
      const currentUrls = prev.image_urls || [];
      const updatedUrls = currentUrls.includes(suggestedUrl) ? currentUrls : [...currentUrls, suggestedUrl];
      return {
        ...prev,
        image_url: prev.image_url ? prev.image_url : suggestedUrl,
        image_urls: updatedUrls
      };
    });
  };

  // Generate Facebook share text
  const getFormattedFacebookPost = (postId) => {
    return `📝 NEW BLOG REVIEW from Little Locals Central Coast! 📝

"${form.title}"

✨ Category: ${form.category || 'Review'}
📖 ${form.excerpt || form.content?.slice(0, 150) + '...'}

Read the full review and guide here: https://littlelocals.au/blog/${postId}`;
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
      let postId = id;

      if (isEditMode) {
        const docRef = doc(db, 'posts', id);
        await updateDoc(docRef, form);
      } else {
        const colRef = collection(db, 'posts');
        const docAdded = await addDoc(colRef, form);
        postId = docAdded.id;
      }

      // If checked, post directly to Facebook via Vercel serverless function
      if (shareToFacebook) {
        try {
          const fbMessage = getFormattedFacebookPost(postId);
          const response = await fetch('/api/post-to-facebook', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: fbMessage,
              link: `https://littlelocals.au/blog/${postId}`,
              image_url: form.image_url
            })
          });

          const fbData = await response.json();
          if (!response.ok) {
            alert(`Article saved successfully! However, direct Facebook posting failed: ${fbData.error || 'Server error'}. You can still copy the caption manually from the article page!`);
          } else {
            alert("Article saved and successfully shared directly to your Facebook Page! 🎉");
          }
        } catch (fbErr) {
          console.error("Facebook post catch error:", fbErr);
          alert("Article saved successfully, but direct Facebook post failed due to a connection error. You can still share it manually!");
        }
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
              disabled={loading || uploading}
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
                disabled={loading || uploading}
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
                disabled={loading || uploading}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Featured Image Uploader */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Upload Photos / Images</label>
            
            {/* File Upload Box */}
            <div style={{ marginBottom: '12px', padding: '16px', border: '2px dashed var(--border-soft)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-cream)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-dark)' }}>Upload Photos from Device (Select multiple)</span>
              <input 
                type="file" 
                multiple
                accept="image/*" 
                onChange={handleMultipleFilesUpload} 
                disabled={loading || uploading} 
                style={{ fontSize: '0.9rem' }}
              />
              {uploading && uploadingFiles.length > 0 && (
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {uploadingFiles.map((file, idx) => (
                    <div key={idx} style={{ fontSize: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', fontWeight: '700' }}>
                        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '70%' }}>{file.name}</span>
                        <span>{file.progress}%</span>
                      </div>
                      <div style={{ height: '6px', width: '100%', backgroundColor: 'var(--border-soft)', borderRadius: '50px', overflow: 'hidden' }}>
                        <div style={{ 
                          height: '100%', 
                          width: `${file.progress}%`, 
                          backgroundColor: file.status === 'error' ? '#ff6b6b' : 'var(--teal)', 
                          transition: 'width 0.2s ease' 
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', margin: '8px 0', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700' }}>
              <div style={{ height: '1px', flexGrow: 1, backgroundColor: 'var(--border-soft)' }} />
              <span>OR ENTER IMAGE URL</span>
              <div style={{ height: '1px', flexGrow: 1, backgroundColor: 'var(--border-soft)' }} />
            </div>

            {/* Input URL */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ position: 'relative', flexGrow: 1 }}>
                <Image style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                <input 
                  type="url" 
                  placeholder="Paste Image URL (https://...) and press add" 
                  className="form-control"
                  style={{ paddingLeft: '48px' }}
                  value={manualImageUrl}
                  onChange={(e) => setManualImageUrl(e.target.value)}
                  disabled={loading || uploading}
                />
              </div>
              <button 
                type="button" 
                className="btn btn-outline" 
                style={{ padding: '0 20px', gap: '6px', whiteSpace: 'nowrap' }} 
                onClick={handleAddManualImage}
                disabled={loading || uploading || !manualImageUrl}
              >
                Add Photo
              </button>
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
            
            {/* Gallery of Uploaded Photos */}
            {form.image_urls && form.image_urls.length > 0 && (
              <div style={{ marginTop: '16px', border: '2.5px solid var(--text-dark)', borderRadius: '16px', padding: '16px', backgroundColor: 'var(--bg-white)', boxShadow: '4px 4px 0px 0px var(--text-dark)' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '900', color: 'var(--primary)', textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>
                  Blog Post Photos Gallery ({form.image_urls.length})
                </span>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '16px' }}>
                  {form.image_urls.map((url, idx) => {
                    const isFeatured = form.image_url === url;
                    return (
                      <div key={idx} style={{ 
                        position: 'relative', 
                        borderRadius: '12px', 
                        border: isFeatured ? '3px solid var(--primary)' : '2px solid var(--text-dark)', 
                        overflow: 'hidden',
                        height: '110px',
                        boxShadow: isFeatured ? '0 0 10px rgba(3, 63, 29, 0.2)' : 'none'
                      }}>
                        <img src={url} alt={`Gallery ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        
                        {/* Featured Badge */}
                        {isFeatured && (
                          <div style={{ position: 'absolute', top: '4px', left: '4px', backgroundColor: 'var(--primary)', color: 'white', padding: '1px 6px', fontSize: '8px', fontWeight: '900', borderRadius: '4px', textTransform: 'uppercase' }}>
                            Featured
                          </div>
                        )}

                        {/* Actions overlay */}
                        <div style={{ 
                          position: 'absolute', 
                          bottom: 0, 
                          left: 0, 
                          right: 0, 
                          backgroundColor: 'rgba(28, 27, 27, 0.85)', 
                          display: 'flex', 
                          justifyContent: 'space-around', 
                          padding: '4px 0' 
                        }}>
                          <button
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, image_url: url }))}
                            title="Set as Featured Image"
                            style={{ background: 'none', border: 'none', color: isFeatured ? 'var(--yellow-soft)' : 'white', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center' }}
                          >
                            ★
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setForm(prev => {
                                const updatedUrls = prev.image_urls.filter(u => u !== url);
                                let featured = prev.image_url;
                                if (featured === url) {
                                  featured = updatedUrls.length > 0 ? updatedUrls[0] : '';
                                }
                                return {
                                  ...prev,
                                  image_url: featured,
                                  image_urls: updatedUrls
                                };
                              });
                            }}
                            title="Delete Image"
                            style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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
              disabled={loading || uploading}
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
              placeholder="Write your detailed review or guide here. Use spaces and paragraphs freely to format your layout..." 
              className="form-control"
              style={{ minHeight: '300px' }}
              value={form.content}
              onChange={handleChange}
              disabled={loading || uploading}
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
              disabled={loading || uploading}
            />
            <label htmlFor="is_published" style={{ fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer', color: 'var(--text-dark)' }}>
              Publish immediately (makes post visible to the public)
            </label>
          </div>

          {/* Direct Facebook Page share trigger */}
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
              id="share_to_facebook" 
              style={{ width: '20px', height: '20px', accentColor: 'var(--primary)', cursor: 'pointer' }}
              checked={shareToFacebook}
              onChange={(e) => setShareToFacebook(e.target.checked)}
              disabled={loading || uploading}
            />
            <label htmlFor="share_to_facebook" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', fontSize: '0.9rem', color: 'var(--text-dark)', cursor: 'pointer' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--primary)"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              Share directly to Little Locals Facebook Page
            </label>
          </div>

          {/* Save Button */}
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '16px', gap: '10px', marginTop: '16px' }}
            disabled={loading || uploading}
          >
            <Save size={20} /> {loading ? 'Saving Post...' : 'Save and Publish'}
          </button>

        </form>

      </div>

    </div>
  );
}
