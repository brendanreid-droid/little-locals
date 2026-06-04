import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, getDocs, doc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ArrowLeft, Send, Trash2, Mail, Users, CheckSquare, Square, Eye, AlertCircle, Calendar, BookOpen, RefreshCw } from 'lucide-react';

export default function AdminNewsletter() {
  const navigate = useNavigate();
  
  // Database states
  const [subscribers, setSubscribers] = useState([]);
  const [events, setEvents] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form states
  const [subject, setSubject] = useState('');
  const [preheader, setPreheader] = useState('');
  const [message, setMessage] = useState('Hey Coastie families!\n\nHere is your monthly scoop on the best free kid-friendly activities, events, and playground reviews across the Central Coast.\n\nGrab a coffee, pack some snacks, and let the little ones run wild! Check out the list below.');
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [selectedBlogPost, setSelectedBlogPost] = useState('');

  // UI state
  const [activeSubTab, setActiveSubTab] = useState('compose'); // 'compose' or 'subscribers'
  const [sendingTest, setSendingTest] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendingCampaign, setSendingCampaign] = useState(false);
  const [campaignProgress, setCampaignProgress] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Auth protection
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/admin/login');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Load subscribers, events, and posts
  const loadAllData = async () => {
    setLoadingData(true);
    setError('');
    try {
      // 1. Fetch Subscribers
      const subSnap = await getDocs(collection(db, 'subscribers'));
      const subs = subSnap.docs.map(docObj => ({
        id: docObj.id,
        ...docObj.data()
      })).sort((a, b) => b.subscribedAt?.localeCompare(a.subscribedAt));
      setSubscribers(subs);

      // 2. Fetch Events (Only active ones, sort by date)
      const todayStr = new Date().toISOString().split('T')[0];
      const eventsCol = collection(db, 'events');
      const eq = query(eventsCol, orderBy('date', 'asc'));
      const eventSnap = await getDocs(eq);
      const evData = eventSnap.docs.map(docObj => ({ id: docObj.id, ...docObj.data() }))
        .filter(event => event.date >= todayStr);
      setEvents(evData);

      // 3. Fetch Posts (Recent ones)
      const postsCol = collection(db, 'posts');
      const pq = query(postsCol, orderBy('date', 'desc'));
      const postSnap = await getDocs(pq);
      const postData = postSnap.docs.map(docObj => ({ id: docObj.id, ...docObj.data() }));
      setPosts(postData);

    } catch (err) {
      console.error("Error loading newsletter data:", err);
      setError("Failed to load subscriber or content data: " + err.message);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleDeleteSubscriber = async (id) => {
    if (!window.confirm(`Delete ${id} from subscribers?`)) return;

    try {
      await deleteDoc(doc(db, 'subscribers', id));
      setSubscribers(prev => prev.filter(s => s.id !== id));
      setSuccess("Subscriber deleted successfully.");
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error("Error deleting subscriber:", err);
      setError("Failed to delete subscriber: " + err.message);
    }
  };

  const handleToggleEventSelect = (eventId) => {
    setSelectedEvents(prev => 
      prev.includes(eventId) 
        ? prev.filter(id => id !== eventId) 
        : [...prev, eventId]
    );
  };

  // Compile local preview HTML to show in iframe
  const getPreviewHtml = () => {
    const messageHtml = message
      .split('\n\n')
      .map(para => `<p style="margin-bottom: 16px; font-size: 15px; line-height: 1.6; color: #1c1b1b;">${para.replace(/\n/g, '<br>')}</p>`)
      .join('');

    let eventsHtml = '';
    const selectedEventsData = events.filter(e => selectedEvents.includes(e.id));
    if (selectedEventsData.length > 0) {
      eventsHtml = `
        <div style="margin-top: 24px; border-top: 2px dashed #b6f1bf; padding-top: 24px;">
          <h2 style="font-family: Arial, sans-serif; font-size: 18px; font-weight: bold; color: #033f1d; margin-bottom: 16px;">🌟 Featured Activities</h2>
      `;
      selectedEventsData.forEach(event => {
        eventsHtml += `
          <div style="background-color: #ffffff; border: 2.5px solid #1c1b1b; border-radius: 12px; padding: 14px; margin-bottom: 14px; box-shadow: 3px 3px 0px 0px #1c1b1b; font-size: 13px;">
            <h4 style="font-size: 15px; font-weight: bold; color: #033f1d; margin: 0 0 4px 0;">${event.title}</h4>
            <div style="font-weight: bold; color: #8e4e00; margin-bottom: 4px;">📅 ${event.date} ${event.time ? `• ⏰ ${event.time}` : ''}</div>
            <div style="color: #666;">📍 ${event.location?.split(',')[0]}</div>
          </div>
        `;
      });
      eventsHtml += `</div>`;
    }

    let blogHtml = '';
    if (selectedBlogPost) {
      const post = posts.find(p => p.id === selectedBlogPost);
      if (post) {
        blogHtml = `
          <div style="margin-top: 24px; border-top: 2px dashed #b6f1bf; padding-top: 24px;">
            <h2 style="font-family: Arial, sans-serif; font-size: 18px; font-weight: bold; color: #033f1d; margin-bottom: 16px;">📖 Featured Local Guide</h2>
            <div style="background-color: #ffffff; border: 2.5px solid #1c1b1b; border-radius: 12px; padding: 16px; box-shadow: 3px 3px 0px 0px #1c1b1b; font-size: 13px;">
              <h4 style="font-size: 15px; font-weight: bold; color: #033f1d; margin: 0 0 6px 0;">${post.title}</h4>
              <p style="color: #666; line-height: 1.4; margin: 0 0 8px 0;">${post.excerpt || post.content?.slice(0, 100) + '...'}</p>
            </div>
          </div>
        `;
      }
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: sans-serif; background-color: #fcf9f8; color: #1c1b1b; padding: 16px; margin: 0; }
          .card { background-color: white; border: 3px solid #1c1b1b; border-radius: 20px; box-shadow: 6px 6px 0px 0px #033f1d; overflow: hidden; max-width: 500px; margin: 0 auto; }
          .header { background-color: #033f1d; color: white; padding: 24px 16px; text-align: center; border-bottom: 3px solid #1c1b1b; }
          .body { padding: 24px 20px; }
          .footer { background-color: #fcf9f8; border-top: 3px solid #1c1b1b; padding: 16px; text-align: center; font-size: 11px; color: #777777; }
        </style>
      </head>
      <body>
        <div style="display: none; max-height: 0px; overflow: hidden;">${preheader}</div>
        <div class="card">
          <div class="header">
            <h1 style="margin: 0; font-size: 22px; font-weight: 900; letter-spacing: -0.01em;">LITTLE LOCALS</h1>
            <div style="font-size: 11px; opacity: 0.9; margin-top: 4px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">Central Coast Kids Scoop</div>
          </div>
          <div class="body">
            ${messageHtml}
            ${eventsHtml}
            ${blogHtml}
          </div>
          <div class="footer">
            <p>Little Locals Central Coast • Unsubscribe reply newsletter@littlelocalscc.com</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const handleSendTest = async (e) => {
    e.preventDefault();
    if (!subject || !testEmail) {
      setError('Please enter a Subject and Test Email Address.');
      return;
    }

    setSendingTest(true);
    setError('');
    setSuccess('');

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('You must be logged in as an admin.');
      const idToken = await user.getIdToken();

      const selectedEventsData = events.filter(e => selectedEvents.includes(e.id));
      const selectedPostData = posts.find(p => p.id === selectedBlogPost) || null;

      const response = await fetch('/api/send-newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          subject,
          preheader,
          message,
          emails: [testEmail],
          events: selectedEventsData,
          blogPost: selectedPostData
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to send test email.');
      }

      setSuccess(`Test email sent successfully to ${testEmail}! 🎉`);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error sending test email.');
    } finally {
      setSendingTest(false);
    }
  };

  const handleSendCampaign = async () => {
    const count = subscribers.length;
    if (count === 0) {
      alert("No subscribers found! Cannot send campaign.");
      return;
    }

    if (!subject) {
      alert("Please specify a Subject for the newsletter campaign.");
      return;
    }

    const confirmSend = window.confirm(
      `⚠️ WARNING: You are about to send this email to ALL ${count} registered subscribers.\n\n` +
      `Subject: "${subject}"\n\n` +
      `Click OK to proceed with dispatch.`
    );
    if (!confirmSend) return;

    setSendingCampaign(true);
    setCampaignProgress('Authenticating admin...');
    setError('');
    setSuccess('');

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('You must be logged in as an admin.');
      const idToken = await user.getIdToken();

      const selectedEventsData = events.filter(e => selectedEvents.includes(e.id));
      const selectedPostData = posts.find(p => p.id === selectedBlogPost) || null;
      const allEmails = subscribers.map(s => s.email);

      setCampaignProgress(`Dispatching campaign to ${count} subscribers in batches of 100...`);

      const response = await fetch('/api/send-newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          subject,
          preheader,
          message,
          emails: allEmails,
          events: selectedEventsData,
          blogPost: selectedPostData
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to dispatch newsletter campaign.');
      }

      setSuccess(`Campaign successfully dispatched to all ${count} subscribers! 🚀`);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error dispatching newsletter campaign.');
    } finally {
      setSendingCampaign(false);
      setCampaignProgress('');
    }
  };

  return (
    <div style={{ padding: '48px 24px', maxWidth: '1280px', margin: '0 auto', backgroundColor: 'var(--bg-cream)', minHeight: '100vh' }}>
      
      {/* Navigation */}
      <Link to="/admin/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '24px' }}>
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      {/* Main Container Card */}
      <div 
        className="sticker-shadow"
        style={{ 
          backgroundColor: 'var(--bg-white)', 
          border: '3.5px solid var(--text-dark)', 
          borderRadius: '32px',
          overflow: 'hidden',
          boxShadow: '8px 8px 0px 0px var(--text-dark)',
          animation: 'slideUp 0.4s ease'
        }}
      >
        
        {/* Upper Header Panel */}
        <div style={{ padding: '40px 40px 32px 40px', borderBottom: '3.5px solid var(--text-dark)', backgroundColor: 'var(--primary-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px', textAlign: 'left' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '2.4rem', color: 'var(--primary)', margin: 0, letterSpacing: '-0.01em' }}>
              Newsletter Dispatch
            </h1>
            <p style={{ color: 'var(--primary)', opacity: 0.85, fontWeight: '700', fontSize: '1rem', marginTop: '6px' }}>
              Create and distribute styled monthly updates to your registered followers.
            </p>
          </div>

          {/* Sub-tabs Toggle */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => setActiveSubTab('compose')}
              style={{
                padding: '10px 20px',
                fontWeight: '900',
                fontSize: '0.8rem',
                border: '2.5px solid var(--text-dark)',
                borderRadius: '50px',
                backgroundColor: activeSubTab === 'compose' ? 'var(--primary)' : 'var(--bg-white)',
                color: activeSubTab === 'compose' ? 'white' : 'var(--text-dark)',
                boxShadow: activeSubTab === 'compose' ? '3px 3px 0px 0px var(--text-dark)' : 'none',
                transform: activeSubTab === 'compose' ? 'translateY(-2px)' : 'none',
                cursor: 'pointer',
                transition: 'var(--transition-bouncy)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              Compose Newsletter
            </button>
            <button 
              onClick={() => setActiveSubTab('subscribers')}
              style={{
                padding: '10px 20px',
                fontWeight: '900',
                fontSize: '0.8rem',
                border: '2.5px solid var(--text-dark)',
                borderRadius: '50px',
                backgroundColor: activeSubTab === 'subscribers' ? 'var(--primary)' : 'var(--bg-white)',
                color: activeSubTab === 'subscribers' ? 'white' : 'var(--text-dark)',
                boxShadow: activeSubTab === 'subscribers' ? '3px 3px 0px 0px var(--text-dark)' : 'none',
                transform: activeSubTab === 'subscribers' ? 'translateY(-2px)' : 'none',
                cursor: 'pointer',
                transition: 'var(--transition-bouncy)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              Subscribers ({subscribers.length})
            </button>
          </div>
        </div>

        {/* Global Success / Error Callouts */}
        {(error || success || campaignProgress) && (
          <div style={{ padding: '24px 40px 0 40px' }}>
            {error && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: 'hsl(0, 100%, 97%)', border: '2.5px solid hsl(0, 100%, 80%)', padding: '16px', borderRadius: '16px', color: 'hsl(0, 80%, 35%)', fontSize: '0.9rem', fontWeight: '700', textAlign: 'left', animation: 'slideUp 0.3s ease' }}>
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: 'hsl(147, 91%, 95%)', border: '2.5px solid hsl(147, 91%, 80%)', padding: '16px', borderRadius: '16px', color: 'hsl(147, 91%, 20%)', fontSize: '0.9rem', fontWeight: '700', textAlign: 'left', animation: 'slideUp 0.3s ease' }}>
                <span>{success}</span>
              </div>
            )}
            {campaignProgress && (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', backgroundColor: 'var(--secondary-soft)', border: '2.5px solid var(--secondary)', padding: '16px', borderRadius: '16px', color: 'var(--secondary)', fontSize: '0.9rem', fontWeight: '800', textAlign: 'left', animation: 'slideUp 0.3s ease' }}>
                <RefreshCw className="animate-spin" size={20} />
                <span>{campaignProgress}</span>
              </div>
            )}
          </div>
        )}

        {loadingData ? (
          <div style={{ padding: '80px 0', textAlign: 'center' }}>
            <div style={{ width: '50px', height: '50px', border: '5px solid var(--primary-soft)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ fontWeight: '800', color: 'var(--primary)' }}>Loading campaign details...</p>
          </div>
        ) : activeSubTab === 'subscribers' ? (
          
          /* SUBSCRIBERS LIST VIEW */
          <div style={{ padding: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem', color: 'var(--primary)' }}>
                Registered Followers List
              </h3>
              <button 
                onClick={loadAllData}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}
              >
                <RefreshCw size={16} /> Refresh
              </button>
            </div>

            {subscribers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 24px', border: '3px dashed var(--text-dark)', borderRadius: '24px', backgroundColor: 'var(--bg-cream)' }}>
                <Users size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
                <h4 style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--primary)' }}>No active followers yet</h4>
                <p style={{ color: 'var(--text-muted)', marginTop: '4px', fontSize: '0.9rem' }}>Users can subscribe via the home page footer scoop form.</p>
              </div>
            ) : (
              <div style={{ border: '3px solid var(--text-dark)', borderRadius: '16px', overflow: 'hidden', boxShadow: '4px 4px 0px 0px var(--text-dark)' }}>
                <div style={{ maxHeight: '500px', overflowY: 'auto' }} className="custom-scrollbar">
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--primary-soft)', borderBottom: '3px solid var(--text-dark)' }}>
                        <th style={{ padding: '16px 24px', fontWeight: '900', color: 'var(--primary)' }}>Email Address</th>
                        <th style={{ padding: '16px 24px', fontWeight: '900', color: 'var(--primary)' }}>Subscribed On</th>
                        <th style={{ padding: '16px 24px', fontWeight: '900', color: 'var(--primary)', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subscribers.map((sub, index) => (
                        <tr 
                          key={sub.id} 
                          style={{ 
                            borderBottom: index === subscribers.length - 1 ? 'none' : '2px solid var(--border-soft)',
                            backgroundColor: index % 2 === 0 ? '#ffffff' : 'var(--bg-cream)'
                          }}
                        >
                          <td style={{ padding: '16px 24px', fontWeight: '700', color: 'var(--text-dark)' }}>{sub.email}</td>
                          <td style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: '600' }}>
                            {sub.subscribedAt ? new Date(sub.subscribedAt).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' }) : 'Unknown'}
                          </td>
                          <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                            <button 
                              onClick={() => handleDeleteSubscriber(sub.id)}
                              style={{ 
                                backgroundColor: 'transparent', 
                                border: 'none', 
                                color: '#ff6b6b', 
                                cursor: 'pointer',
                                padding: '6px',
                                borderRadius: '6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                transition: 'transform 0.1s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          
          /* COMPOSE & SEND VIEW */
          <div style={{ padding: '40px', display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }} className="md:grid-cols-12">
            
            {/* Left Composer Form (Spans 7 columns on md) */}
            <div style={{ gridColumn: 'span 7' }} className="newsletter-composer-pane">
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem', color: 'var(--primary)', marginBottom: '24px', textAlign: 'left' }}>
                1. Campaign Details
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Subject */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="subject">Email Subject Line *</label>
                  <input 
                    type="text" 
                    id="subject" 
                    placeholder="e.g. Free beach sensory play & new playground guide! 🏖️" 
                    className="form-control"
                    style={{ border: '3px solid var(--text-dark)', boxShadow: 'none' }}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    disabled={sendingCampaign}
                  />
                </div>

                {/* Preheader */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="preheader">Inbox Preview / Preheader Text</label>
                  <input 
                    type="text" 
                    id="preheader" 
                    placeholder="Short summary displayed in the email inbox list view..." 
                    className="form-control"
                    style={{ border: '3px solid var(--text-dark)', boxShadow: 'none' }}
                    value={preheader}
                    onChange={(e) => setPreheader(e.target.value)}
                    disabled={sendingCampaign}
                  />
                </div>

                {/* Message Body */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="message">Email Welcome Message *</label>
                  <textarea 
                    id="message" 
                    className="form-control"
                    style={{ border: '3px solid var(--text-dark)', borderRadius: '16px', minHeight: '180px', resize: 'vertical' }}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={sendingCampaign}
                  />
                </div>

                {/* Event Selector Checklist */}
                <div style={{ border: '3px solid var(--text-dark)', borderRadius: '20px', padding: '24px', backgroundColor: 'var(--bg-cream)', textAlign: 'left' }}>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.05rem', fontWeight: '900', color: 'var(--primary)', marginBottom: '14px' }}>
                    <Calendar size={18} /> Embed Upcoming Free Events
                  </h4>
                  {events.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>No upcoming events scheduled on the calendar to embed.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '180px', overflowY: 'auto' }} className="custom-scrollbar">
                      {events.map(event => {
                        const isChecked = selectedEvents.includes(event.id);
                        return (
                          <div 
                            key={event.id}
                            onClick={() => handleToggleEventSelect(event.id)}
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '10px', 
                              padding: '10px 12px',
                              backgroundColor: 'white',
                              border: '2px solid var(--text-dark)',
                              borderRadius: '10px',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              fontWeight: '700',
                              color: isChecked ? 'var(--primary)' : 'var(--text-dark)'
                            }}
                          >
                            {isChecked ? <CheckSquare size={16} style={{ color: 'var(--primary)' }} /> : <Square size={16} />}
                            <span style={{ flexGrow: 1, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{event.title}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{event.date}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Featured Blog Selector */}
                <div style={{ border: '3px solid var(--text-dark)', borderRadius: '20px', padding: '24px', backgroundColor: 'var(--bg-cream)', textAlign: 'left' }}>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.05rem', fontWeight: '900', color: 'var(--primary)', marginBottom: '14px' }}>
                    <BookOpen size={18} /> Feature Recent Family Guide
                  </h4>
                  {posts.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>No blog reviews written to embed.</p>
                  ) : (
                    <select
                      className="form-control"
                      style={{ border: '3px solid var(--text-dark)', borderRadius: '12px', height: '44px', fontWeight: '700' }}
                      value={selectedBlogPost}
                      onChange={(e) => setSelectedBlogPost(e.target.value)}
                      disabled={sendingCampaign}
                    >
                      <option value="">-- Do not feature a blog post --</option>
                      {posts.map(post => (
                        <option key={post.id} value={post.id}>
                          {post.title} ({post.category})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Action dispatch buttons */}
                <div style={{ borderTop: '2px dashed var(--border-soft)', paddingTop: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Send Test Box */}
                  <form onSubmit={handleSendTest} style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ flexGrow: 1, minWidth: '200px' }}>
                      <input 
                        type="email" 
                        placeholder="test@example.com" 
                        required
                        className="form-control"
                        style={{ border: '3px solid var(--text-dark)', height: '48px' }}
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        disabled={sendingTest || sendingCampaign}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={sendingTest || sendingCampaign}
                      style={{
                        height: '48px',
                        padding: '0 24px',
                        fontWeight: '900',
                        fontSize: '0.9rem',
                        backgroundColor: 'var(--bg-white)',
                        color: 'var(--text-dark)',
                        border: '3px solid var(--text-dark)',
                        borderRadius: '50px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '3px 3px 0px 0px var(--text-dark)',
                        transition: 'var(--transition-bouncy)'
                      }}
                    >
                      <Mail size={16} /> {sendingTest ? 'Sending Test...' : 'Send Test'}
                    </button>
                  </form>

                  {/* Send Monthly Scoop Campaign */}
                  <button
                    onClick={handleSendCampaign}
                    disabled={sendingCampaign || sendingTest || !subject}
                    style={{
                      width: '100%',
                      padding: '16px',
                      fontWeight: '900',
                      fontSize: '1rem',
                      backgroundColor: 'var(--secondary)',
                      color: 'white',
                      border: '3px solid var(--text-dark)',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '4px 4px 0px 0px var(--text-dark)',
                      transition: 'var(--transition-bouncy)'
                    }}
                  >
                    <Send size={18} /> {sendingCampaign ? 'Sending Campaign...' : `Send Newsletter to ${subscribers.length} Followers`}
                  </button>

                </div>

              </div>
            </div>

            {/* Right Live Preview Panel (Spans 5 columns on md) */}
            <div style={{ gridColumn: 'span 5', display: 'flex', flexDirection: 'column' }} className="newsletter-preview-pane">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem', color: 'var(--primary)', marginBottom: '24px', textAlign: 'left' }}>
                <Eye size={20} /> 2. Live Email Preview
              </h3>

              <div style={{ border: '3.5px solid var(--text-dark)', borderRadius: '24px', overflow: 'hidden', flexGrow: 1, height: '620px', backgroundColor: 'white', boxShadow: '4px 4px 0px 0px var(--text-dark)' }}>
                <iframe 
                  title="Branded Email Live Preview"
                  srcDoc={getPreviewHtml()}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
