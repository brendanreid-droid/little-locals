import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, getDocs, doc, deleteDoc, addDoc, updateDoc, query, orderBy } from 'firebase/firestore';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { db, auth, storage } from '../firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Plus, Edit2, Trash2, LogOut, Search, Calendar, MapPin, Smile, CheckCircle, XCircle, BookOpen, Cpu, RefreshCw, Mail, AlertTriangle, Repeat } from 'lucide-react';

export default function AdminDashboard() {
  const [events, setEvents] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [posts, setPosts] = useState([]);
  const [scraping, setScraping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('events'); // 'events', 'suggestions', or 'posts'
  const [searchTerm, setSearchTerm] = useState('');
  const [editingSuggestion, setEditingSuggestion] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [monthlyVisits, setMonthlyVisits] = useState(0);
  const [topEventThisMonth, setTopEventThisMonth] = useState(null);
  const [topPostThisMonth, setTopPostThisMonth] = useState(null);
  const [extendingSeries, setExtendingSeries] = useState(null);
  const [showSeriesManager, setShowSeriesManager] = useState(false);
  const navigate = useNavigate();

  const timeOptions = [
    'Flexible',
    '12:00 AM', '12:30 AM', '1:00 AM', '1:30 AM', '2:00 AM', '2:30 AM', '3:00 AM', '3:30 AM', '4:00 AM', '4:30 AM', '5:00 AM', '5:30 AM',
    '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM', '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
    '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM', '10:30 PM', '11:00 PM', '11:30 PM'
  ];

  const getParsedSuggestionTimes = () => {
    let start = 'Flexible';
    let end = 'Flexible';
    const timeVal = editingSuggestion?.time || '';
    if (timeVal) {
      if (timeVal.includes(' - ')) {
        const parts = timeVal.split(' - ');
        start = parts[0];
        end = parts[1];
      } else {
        start = timeVal;
        end = 'Flexible';
      }
    }
    return { start, end };
  };

  const getSuggestionSelectOptions = (val) => {
    if (val && !timeOptions.includes(val)) {
      return [val, ...timeOptions];
    }
    return timeOptions;
  };

  const handleSuggestionTimeChange = (type, val) => {
    const { start, end } = getParsedSuggestionTimes();
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

    setEditingSuggestion(prev => ({ ...prev, time: combined }));
  };

  const { start: sugStartTime, end: sugEndTime } = getParsedSuggestionTimes();
  const sugStartOptions = getSuggestionSelectOptions(sugStartTime);
  const sugEndOptions = getSuggestionSelectOptions(sugEndTime);

  // Authentication check
  useEffect(() => {
    document.title = 'Admin Dashboard | Little Locals';
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/admin/login');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Load database items
  useEffect(() => {
    async function loadData() {
      try {
        // Get today's local date string in YYYY-MM-DD
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;

        // Fetch events
        const eventsCol = collection(db, 'events');
        const eq = query(eventsCol, orderBy('date', 'asc'));
        const eventSnapshot = await getDocs(eq);
        const fetchedEvents = eventSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Delete past events from Firestore
        const activeEvents = [];
        for (const event of fetchedEvents) {
          if (event.date && event.date < todayStr) {
            try {
              await deleteDoc(doc(db, 'events', event.id));
            } catch (err) {
              console.error("Failed to delete expired event:", event.id, err);
            }
          } else {
            activeEvents.push(event);
          }
        }
        setEvents(activeEvents);

        // Fetch suggestions (from scraper queue)
        const suggestionsCol = collection(db, 'suggestions');
        const suggestionSnapshot = await getDocs(suggestionsCol);
        const fetchedSuggestions = suggestionSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Delete past suggestions from Firestore
        const activeSuggestions = [];
        for (const sug of fetchedSuggestions) {
          if (sug.date && sug.date < todayStr) {
            try {
              await deleteDoc(doc(db, 'suggestions', sug.id));
            } catch (err) {
              console.error("Failed to delete expired suggestion:", sug.id, err);
            }
          } else {
            activeSuggestions.push(sug);
          }
        }
        setSuggestions(activeSuggestions);

        // Fetch blog posts
        const postsCol = collection(db, 'posts');
        const pq = query(postsCol, orderBy('date', 'desc'));
        const postSnapshot = await getDocs(pq);
        const fetchedPosts = postSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPosts(fetchedPosts);

        // Fetch daily visits to compute monthly total
        const visitsCol = collection(db, 'analytics_visits');
        const visitSnapshot = await getDocs(visitsCol);
        const visitData = visitSnapshot.docs.map(doc => ({ id: doc.id, visits: doc.data().visits || 0 }));

        const currentYearMonth = `${yyyy}-${mm}`;

        // Monthly visits (sum of all visits in the current calendar month)
        const monthlyCount = visitData
          .filter(v => v.id.startsWith(currentYearMonth))
          .reduce((sum, v) => sum + v.visits, 0);
        setMonthlyVisits(monthlyCount);

        // Fetch monthly clicks
        const clicksCol = collection(db, 'analytics_monthly_clicks');
        const clickSnapshot = await getDocs(clicksCol);
        const clickData = clickSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const currentMonthClicks = clickData.filter(c => c.month === currentYearMonth);

        // Calculate top clicked event this month
        const eventClicks = currentMonthClicks.filter(c => c.itemType === 'event');
        const sortedEventClicks = [...eventClicks].sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
        if (sortedEventClicks.length > 0) {
          const topEvId = sortedEventClicks[0].itemId;
          const matchingEvent = fetchedEvents.find(e => e.id === topEvId);
          setTopEventThisMonth(matchingEvent ? { ...matchingEvent, monthlyClicks: sortedEventClicks[0].clicks } : { title: 'Deleted/Unknown Event', clicks: sortedEventClicks[0].clicks, monthlyClicks: sortedEventClicks[0].clicks });
        } else {
          setTopEventThisMonth(null);
        }

        // Calculate top clicked blog post this month
        const postClicks = currentMonthClicks.filter(c => c.itemType === 'post');
        const sortedPostClicks = [...postClicks].sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
        if (sortedPostClicks.length > 0) {
          const topPId = sortedPostClicks[0].itemId;
          const matchingPost = fetchedPosts.find(p => p.id === topPId);
          setTopPostThisMonth(matchingPost ? { ...matchingPost, monthlyClicks: sortedPostClicks[0].clicks } : { title: 'Deleted/Unknown Post', clicks: sortedPostClicks[0].clicks, monthlyClicks: sortedPostClicks[0].clicks });
        } else {
          setTopPostThisMonth(null);
        }

      } catch (error) {
        console.error("Error loading admin dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSuggestionImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    setUploadProgress(0);

    try {
      const storageRef = ref(storage, `event_images/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setUploadProgress(progress);
        },
        (err) => {
          console.error("Image upload error:", err);
          alert("Failed to upload image: " + err.message);
          setUploadingImage(false);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            setEditingSuggestion(prev => ({
              ...prev,
              image_url: downloadUrl
            }));
            setUploadingImage(false);
            alert("Image uploaded successfully!");
          } catch (urlErr) {
            console.error("Error getting download URL:", urlErr);
            alert("Failed to get image URL: " + urlErr.message);
            setUploadingImage(false);
          }
        }
      );
    } catch (err) {
      console.error("Firebase Storage setup error:", err);
      alert("Failed to start upload: " + err.message);
      setUploadingImage(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleDeleteEvent = async (event) => {
    const isRecurring = !!event.recurring_id;
    let deleteChoice = 'single'; // 'single', 'all', or null (cancel)

    if (isRecurring) {
      const deleteAll = window.confirm(
        "This event is part of a recurring series.\n\n" +
        "Click OK to delete ALL events in this recurring series.\n" +
        "Click Cancel to delete ONLY this single occurrence."
      );
      if (deleteAll) {
        deleteChoice = 'all';
      } else {
        const deleteSingle = window.confirm("Are you sure you want to delete ONLY this single event occurrence?");
        if (!deleteSingle) return;
        deleteChoice = 'single';
      }
    } else {
      if (!window.confirm("Are you sure you want to delete this event listing?")) return;
    }

    try {
      if (deleteChoice === 'all') {
        const eventsCol = collection(db, 'events');
        const snapshot = await getDocs(eventsCol);
        const matchingEvents = snapshot.docs.filter(docObj => docObj.data().recurring_id === event.recurring_id);
        
        for (const docObj of matchingEvents) {
          await deleteDoc(doc(db, 'events', docObj.id));
        }
        
        setEvents(prev => prev.filter(e => e.recurring_id !== event.recurring_id));
        alert("All occurrences in the recurring series have been deleted.");
      } else {
        await deleteDoc(doc(db, 'events', event.id));
        setEvents(prev => prev.filter(e => e.id !== event.id));
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      alert("Failed to delete event: " + error.message);
    }
  };

  const handleDeletePost = async (id) => {
    if (!window.confirm("Are you sure you want to delete this blog post?")) return;
    
    try {
      await deleteDoc(doc(db, 'posts', id));
      setPosts(prev => prev.filter(post => post.id !== id));
    } catch (error) {
      console.error("Error deleting post:", error);
      alert("Failed to delete blog post: " + error.message);
    }
  };

  const handleApproveSuggestion = async (suggestion) => {
    try {
      // Add to main events collection
      const eventsCol = collection(db, 'events');
      await addDoc(eventsCol, {
        title: suggestion.title,
        date: suggestion.date || '',
        time: suggestion.time || '',
        location: suggestion.location || '',
        description: suggestion.description || '',
        image_url: suggestion.image_url || '',
        price: 'FREE',
        link: suggestion.link || '',
        category: suggestion.category || 'Playgrounds',
        age_group: suggestion.age_group || 'All Ages',
        is_featured: suggestion.is_featured || false
      });

      // Delete from suggestions queue
      await deleteDoc(doc(db, 'suggestions', suggestion.id));
      
      // Update UI state
      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
      
      // Refresh events
      const eventsColRef = collection(db, 'events');
      const eq = query(eventsColRef, orderBy('date', 'asc'));
      const eventSnapshot = await getDocs(eq);
      setEvents(eventSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      
      alert("Suggested event approved and added to live calendar!");
    } catch (error) {
      console.error("Error approving suggestion:", error);
      alert("Failed to approve suggestion: " + error.message);
    }
  };

  const handleApproveAndPublishEditedSuggestion = async (e) => {
    e.preventDefault();
    if (!editingSuggestion.title || !editingSuggestion.date || !editingSuggestion.location) {
      alert("Please fill in the Title, Date, and Location fields.");
      return;
    }
    
    try {
      // 1. Add to main events collection
      const eventsCol = collection(db, 'events');
      await addDoc(eventsCol, {
        title: editingSuggestion.title,
        date: editingSuggestion.date || '',
        time: editingSuggestion.time || '',
        location: editingSuggestion.location || '',
        description: editingSuggestion.description || '',
        image_url: editingSuggestion.image_url || '',
        price: 'FREE',
        link: editingSuggestion.link || '',
        category: editingSuggestion.category || 'Playgrounds',
        age_group: editingSuggestion.age_group || 'All Ages',
        is_featured: editingSuggestion.is_featured || false
      });

      // 2. Delete from suggestions queue
      await deleteDoc(doc(db, 'suggestions', editingSuggestion.id));
      
      // 3. Update UI state (remove from suggestions, add to events)
      setSuggestions(prev => prev.filter(s => s.id !== editingSuggestion.id));
      
      // Refresh events
      const eventsColRef = collection(db, 'events');
      const eq = query(eventsColRef, orderBy('date', 'asc'));
      const eventSnapshot = await getDocs(eq);
      setEvents(eventSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      alert("Event approved, published, and removed from suggestions queue!");
      setEditingSuggestion(null);
    } catch (error) {
      console.error("Error approving edited suggestion:", error);
      alert("Failed to approve suggestion: " + error.message);
    }
  };

  const handleRejectSuggestion = async (id) => {
    if (!window.confirm("Dismiss this recommended lead?")) return;
    
    try {
      await deleteDoc(doc(db, 'suggestions', id));
      setSuggestions(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error("Error rejecting suggestion:", error);
      alert("Failed to dismiss suggestion: " + error.message);
    }
  };

  const handleRunScraper = async () => {
    setScraping(true);
    try {
      const response = await fetch('/api/scrape-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to execute scraper.');
      }
      
      const newSuggestions = data.suggestions || [];
      if (newSuggestions.length === 0) {
        alert("Scraper executed successfully, but found no new free events this time.");
        setScraping(false);
        return;
      }
      
      // Save each scraped suggestion to Firestore if it is not a duplicate
      const suggestionsCol = collection(db, 'suggestions');
      const addedSuggestions = [];
      let skippedCount = 0;
      
      for (const item of newSuggestions) {
        // Compare titles (case-insensitive) and dates to detect duplicates
        const isDuplicate = 
          events.some(e => e.title?.toLowerCase() === item.title?.toLowerCase() && e.date === item.date) ||
          suggestions.some(s => s.title?.toLowerCase() === item.title?.toLowerCase() && s.date === item.date);
          
        if (isDuplicate) {
          skippedCount++;
          continue;
        }

        const docRef = await addDoc(suggestionsCol, item);
        addedSuggestions.push({ id: docRef.id, ...item });
      }
      
      // Update local state instantly so the user sees the new listings
      setSuggestions(prev => [...addedSuggestions, ...prev]);
      
      if (addedSuggestions.length === 0) {
        alert(`Scraper completed successfully! (${data.mode})\n\nAll ${newSuggestions.length} found events were skipped because they are already present on your calendar or suggestions queue.`);
      } else {
        alert(`Scraper completed successfully! (${data.mode})\n\nFound ${newSuggestions.length} events. Added ${addedSuggestions.length} new recommended activities to your queue. Skipped ${skippedCount} duplicates.`);
      }
    } catch (error) {
      console.error("Scraper handler error:", error);
      alert("Scraper run encountered an error: " + error.message);
    } finally {
      setScraping(false);
    }
  };

  const handleExtendEvent = async (title, lastOccDoc) => {
    if (!window.confirm(`Are you sure you want to extend the recurring series "${title}" by 3 months?`)) return;
    setExtendingSeries(title);
    try {
      const occurrences = events
        .filter(e => e.title === title)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      
      let gapDays = 7;
      if (occurrences.length >= 2) {
        const lastDate = new Date(occurrences[occurrences.length - 1].date);
        const prevDate = new Date(occurrences[occurrences.length - 2].date);
        const diffTime = Math.abs(lastDate - prevDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays >= 1 && diffDays <= 31) {
          gapDays = diffDays;
        }
      }
      
      const lastDate = new Date(lastOccDoc.date);
      const newOccs = [];
      const numOccs = Math.floor(90 / gapDays);
      
      for (let i = 1; i <= numOccs; i++) {
        const nextDate = new Date(lastDate);
        nextDate.setDate(lastDate.getDate() + (i * gapDays));
        const nextDateStr = nextDate.toISOString().split('T')[0];
        
        newOccs.push({
          title: lastOccDoc.title,
          category: lastOccDoc.category || 'Playground',
          location: lastOccDoc.location || '',
          time: lastOccDoc.time || '',
          age_group: lastOccDoc.age_group || 'All Ages',
          description: lastOccDoc.description || '',
          image_url: lastOccDoc.image_url || '',
          price: lastOccDoc.price || 'FREE',
          link: lastOccDoc.link || '',
          source: 'Admin Extension',
          created_at: new Date().toISOString()
        });
      }
      
      if (newOccs.length === 0) {
        alert("Could not generate any new occurrences.");
        setExtendingSeries(null);
        return;
      }

      const eventsCol = collection(db, 'events');
      const promises = newOccs.map(async (item) => {
        const docRef = await addDoc(eventsCol, item);
        return { id: docRef.id, ...item };
      });
      
      const newlyAdded = await Promise.all(promises);
      
      setEvents(prev => [...prev, ...newlyAdded].sort((a, b) => new Date(a.date) - new Date(b.date)));
      
      alert(`Successfully extended "${title}" by 3 months! Created ${newOccs.length} new occurrences (every ${gapDays} days).`);
    } catch (error) {
      console.error("Failed to extend event series:", error);
      alert("Failed to extend event series: " + error.message);
    } finally {
      setExtendingSeries(null);
    }
  };

  const filteredEvents = events.filter(event => 
    (event.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (event.location?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const filteredPosts = posts.filter(post => 
    (post.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (post.category?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  // Dynamic titles for the custom analytics cards (live data)
  // Dynamic titles for the custom analytics cards (live data for this month)
  const mostClickedEventTitle = topEventThisMonth ? topEventThisMonth.title : "No events clicked";
  const mostClickedEventCount = topEventThisMonth ? (topEventThisMonth.monthlyClicks || 0) : 0;
  const mostClickedMonthTitle = topPostThisMonth ? topPostThisMonth.title : "No reviews clicked";
  const mostClickedMonthCount = topPostThisMonth ? (topPostThisMonth.monthlyClicks || 0) : 0;

  // Group events by title to find recurring series and their end dates
  const groups = {};
  events.forEach(e => {
    if (!e.title) return;
    if (!groups[e.title]) {
      groups[e.title] = [];
    }
    groups[e.title].push(e);
  });

  const activeSeries = [];
  const endingSeriesList = [];
  const today = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(today.getDate() + 30);
  const past7Days = new Date();
  past7Days.setDate(today.getDate() - 7);

  Object.entries(groups).forEach(([title, occs]) => {
    if (occs.length < 2) return;
    
    occs.sort((a, b) => new Date(a.date) - new Date(b.date));
    const lastOcc = occs[occs.length - 1];
    
    if (lastOcc && lastOcc.date) {
      const endDate = new Date(lastOcc.date);
      const isEndingSoon = endDate >= past7Days && endDate <= thirtyDaysFromNow;
      
      const seriesInfo = {
        title,
        endDate: lastOcc.date,
        lastOccurrenceDoc: lastOcc,
        occurrencesCount: occs.length
      };

      activeSeries.push(seriesInfo);
      if (isEndingSoon) {
        endingSeriesList.push(seriesInfo);
      }
    }
  });

  activeSeries.sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div style={{ 
      padding: '48px 24px', 
      maxWidth: '1280px', 
      margin: '0 auto',
      backgroundColor: 'var(--bg-cream)',
      minHeight: '100vh'
    }}>
      
      {/* Top Welcome Panel */}
      <div 
        className="sticker-shadow"
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '24px', 
          border: '3.5px solid var(--text-dark)', 
          padding: '32px', 
          borderRadius: '24px',
          backgroundColor: 'var(--bg-white)',
          boxShadow: '6px 6px 0px 0px var(--text-dark)',
          marginBottom: '48px',
          animation: 'slideUp 0.4s ease'
        }}
      >
        <div style={{ textAlign: 'left' }}>
          <h1 style={{ 
            fontFamily: 'var(--font-display)',
            fontWeight: 900, 
            fontSize: '2.2rem', 
            margin: 0,
            color: 'var(--primary)',
            letterSpacing: '-0.01em'
          }}>
            Welcome back, <span style={{ color: 'var(--secondary)' }}>Admin</span>!
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '6px', fontWeight: '600' }}>
            Promote free Central Coast events and write helpful family guides.
          </p>
        </div>
        
        <div 
          className="sticker-shadow"
          style={{ 
            display: 'flex', 
            gap: '12px', 
            flexWrap: 'wrap',
            backgroundColor: 'var(--bg-cream)', 
            borderRadius: '20px', 
            border: '2.5px solid var(--text-dark)', 
            padding: '16px',
            boxShadow: '4px 4px 0px 0px var(--text-dark)',
            flex: '1 1 500px'
          }}
        >
          <Link 
            to="/admin/events/new" 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: '12px 16px', 
              backgroundColor: 'var(--bg-white)', 
              borderRadius: '12px', 
              border: '2px solid var(--text-dark)',
              cursor: 'pointer',
              transition: 'var(--transition-bouncy)',
              color: 'var(--text-dark)',
              flex: '1 1 120px'
            }}
            className="quick-launch-btn hover-bg-secondary"
          >
            <Plus size={20} style={{ marginBottom: '4px', color: 'var(--secondary)' }} />
            <span style={{ fontSize: '0.68rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Create Event</span>
          </Link>
          <Link 
            to="/admin/blog/new" 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: '12px 16px', 
              backgroundColor: 'var(--bg-white)', 
              borderRadius: '12px', 
              border: '2px solid var(--text-dark)',
              cursor: 'pointer',
              transition: 'var(--transition-bouncy)',
              color: 'var(--text-dark)',
              flex: '1 1 120px'
            }}
            className="quick-launch-btn hover-bg-tertiary"
          >
            <BookOpen size={20} style={{ marginBottom: '4px', color: 'var(--primary)' }} />
            <span style={{ fontSize: '0.68rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Write Blog</span>
          </Link>
          <Link 
            to="/admin/newsletter" 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: '12px 16px', 
              backgroundColor: 'var(--bg-white)', 
              borderRadius: '12px', 
              border: '2px solid var(--text-dark)',
              cursor: 'pointer',
              transition: 'var(--transition-bouncy)',
              color: 'var(--text-dark)',
              flex: '1 1 120px'
            }}
            className="quick-launch-btn hover-bg-yellow"
          >
            <Mail size={20} style={{ marginBottom: '4px', color: 'var(--yellow)' }} />
            <span style={{ fontSize: '0.68rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Newsletter</span>
          </Link>
          <Link 
            to="/admin/analytics" 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: '12px 16px', 
              backgroundColor: 'var(--bg-white)', 
              borderRadius: '12px', 
              border: '2px solid var(--text-dark)',
              cursor: 'pointer',
              transition: 'var(--transition-bouncy)',
              color: 'var(--text-dark)',
              flex: '1 1 120px'
            }}
            className="quick-launch-btn hover-bg-teal"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px', marginBottom: '4px', color: 'var(--teal-soft)' }}>monitoring</span>
            <span style={{ fontSize: '0.68rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Analytics</span>
          </Link>
          <button 
            onClick={handleLogout} 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: '12px 16px', 
              backgroundColor: 'var(--bg-white)', 
              borderRadius: '12px', 
              border: '2px solid var(--text-dark)',
              cursor: 'pointer',
              transition: 'var(--transition-bouncy)',
              color: 'var(--text-dark)',
              flex: '2 1 252px'
            }}
            className="quick-launch-btn hover-bg-danger"
          >
            <LogOut size={20} style={{ marginBottom: '4px', color: 'hsl(0, 75%, 45%)' }} />
            <span style={{ fontSize: '0.68rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sign Out</span>
          </button>
        </div>
      </div>



      {/* 3. Main Dashboard Workspace Layout */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(12, 1fr)', 
          gap: '32px',
          alignItems: 'start'
        }}
        className="admin-workspace-grid"
      >
        {/* Left Column: Content Pipeline (Spans 8 columns) */}
        <div style={{ gridColumn: 'span 8 / span 8' }} className="admin-content-col">
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '32px',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: '900', color: 'var(--primary)', margin: 0 }}>
              Content Pipeline
            </h2>
            
            {/* Tabs selector */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => { setActiveTab('events'); setSearchTerm(''); }} 
                style={{ 
                  padding: '8px 16px', 
                  fontWeight: '900', 
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  border: '2px solid var(--text-dark)',
                  borderRadius: '50px',
                  backgroundColor: activeTab === 'events' ? 'var(--primary)' : 'var(--bg-white)',
                  color: activeTab === 'events' ? 'white' : 'var(--text-dark)',
                  boxShadow: activeTab === 'events' ? '2px 2px 0px 0px var(--text-dark)' : 'none',
                  transform: activeTab === 'events' ? 'translateY(-2px)' : 'none',
                  transition: 'var(--transition-bouncy)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
                className="admin-tab-btn"
              >
                Events ({events.length})
              </button>

              <button 
                onClick={() => { setActiveTab('posts'); setSearchTerm(''); }} 
                style={{ 
                  padding: '8px 16px', 
                  fontWeight: '900', 
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  border: '2px solid var(--text-dark)',
                  borderRadius: '50px',
                  backgroundColor: activeTab === 'posts' ? 'var(--primary)' : 'var(--bg-white)',
                  color: activeTab === 'posts' ? 'white' : 'var(--text-dark)',
                  boxShadow: activeTab === 'posts' ? '2px 2px 0px 0px var(--text-dark)' : 'none',
                  transform: activeTab === 'posts' ? 'translateY(-2px)' : 'none',
                  transition: 'var(--transition-bouncy)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
                className="admin-tab-btn"
              >
                Blogs ({posts.length})
              </button>
              
              <button 
                onClick={() => { setActiveTab('suggestions'); setSearchTerm(''); }} 
                style={{ 
                  padding: '8px 16px', 
                  fontWeight: '900', 
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  border: '2px solid var(--text-dark)',
                  borderRadius: '50px',
                  backgroundColor: activeTab === 'suggestions' ? 'var(--primary)' : 'var(--bg-white)',
                  color: activeTab === 'suggestions' ? 'white' : 'var(--text-dark)',
                  boxShadow: activeTab === 'suggestions' ? '2px 2px 0px 0px var(--text-dark)' : 'none',
                  transform: activeTab === 'suggestions' ? 'translateY(-2px)' : 'none',
                  transition: 'var(--transition-bouncy)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
                className="admin-tab-btn"
              >
                Suggested ({suggestions.length})
              </button>
            </div>
          </div>

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
              <p style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '1.1rem' }}>Loading dashboard...</p>
            </div>
          ) : activeTab === 'events' ? (
            
            /* Tab: Live Events List */
            <div>
          {/* Search Events box */}
          <div style={{ position: 'relative', maxWidth: '440px', marginBottom: '32px' }}>
            <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
            <input 
              type="text" 
              placeholder="Search current listings..." 
              className="form-control"
              style={{ 
                paddingLeft: '48px',
                border: '3px solid var(--text-dark)',
                borderRadius: '50px',
                backgroundColor: 'var(--bg-white)',
                boxShadow: 'none',
                height: '48px'
              }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Warning Banner for Ending Recurring Series */}
          {endingSeriesList.length > 0 && (
            <div style={{
              backgroundColor: 'hsl(14, 95%, 96%)',
              border: '3px solid var(--text-dark)',
              borderRadius: '20px',
              padding: '20px 24px',
              marginBottom: '28px',
              boxShadow: '4px 4px 0px 0px var(--text-dark)',
              textAlign: 'left'
            }}>
              <h4 style={{ fontWeight: 900, color: 'var(--yellow)', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 8px 0' }}>
                <AlertTriangle size={18} style={{ color: 'var(--yellow)' }} />
                Recurring Series Ending Soon!
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 16px 0', fontWeight: '500' }}>
                The following repeating event series will finish in the next 30 days. Extend them to keep the calendar populated.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {endingSeriesList.map(series => (
                  <div key={series.title} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', padding: '10px 16px', backgroundColor: 'var(--bg-white)', borderRadius: '12px', border: '2.5px solid var(--text-dark)' }}>
                    <div>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--text-dark)' }}>{series.title}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Ends on: {new Date(series.endDate).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })} ({series.occurrencesCount} instances)
                      </div>
                    </div>
                    <button
                      onClick={() => handleExtendEvent(series.title, series.lastOccurrenceDoc)}
                      disabled={extendingSeries === series.title}
                      className="btn btn-secondary"
                      style={{ padding: '8px 16px', fontSize: '0.75rem', height: '36px', border: '2px solid var(--text-dark)', boxShadow: '2px 2px 0px 0px var(--text-dark)' }}
                    >
                      {extendingSeries === series.title ? 'Extending...' : 'Extend 3 Months'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Collapsible Recurring Series Manager */}
          <div style={{
            backgroundColor: 'var(--bg-white)',
            border: '3px solid var(--text-dark)',
            borderRadius: '20px',
            padding: '20px 24px',
            marginBottom: '32px',
            boxShadow: '6px 6px 0px 0px var(--text-dark)',
            textAlign: 'left'
          }}>
            <div 
              onClick={() => setShowSeriesManager(!showSeriesManager)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            >
              <h4 style={{ fontWeight: 900, color: 'var(--primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Repeat size={18} />
                Manage Recurring Series ({activeSeries.length})
              </h4>
              <span style={{ fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--secondary)' }}>
                {showSeriesManager ? 'Hide Series' : 'Show Series'}
              </span>
            </div>

            {showSeriesManager && (
              <div style={{ marginTop: '20px', borderTop: '2.5px solid var(--text-dark)', paddingTop: '20px' }}>
                {activeSeries.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', margin: 0 }}>No active recurring series found on the calendar.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto', paddingRight: '8px' }} className="custom-scrollbar">
                    {activeSeries.map(series => (
                      <div key={series.title} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', padding: '10px 16px', backgroundColor: 'var(--bg-cream)', borderRadius: '12px', border: '2.5px solid var(--text-dark)' }}>
                        <div>
                          <strong style={{ fontSize: '0.85rem', color: 'var(--text-dark)' }}>{series.title}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Scheduled until: {new Date(series.endDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })} ({series.occurrencesCount} instances)
                          </div>
                        </div>
                        <button
                          onClick={() => handleExtendEvent(series.title, series.lastOccurrenceDoc)}
                          disabled={extendingSeries === series.title}
                          className="btn btn-primary"
                          style={{ padding: '6px 14px', fontSize: '0.7rem', height: '32px', border: '2px solid var(--text-dark)', boxShadow: '2px 2px 0px 0px var(--text-dark)' }}
                        >
                          {extendingSeries === series.title ? 'Extending...' : 'Extend'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {filteredEvents.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '64px 24px', 
              backgroundColor: 'var(--bg-white)', 
              borderRadius: '24px', 
              border: '3px dashed var(--text-dark)',
              boxShadow: '6px 6px 0px 0px var(--text-dark)'
            }}>
              <Smile size={48} style={{ color: 'var(--secondary)', marginBottom: '16px' }} />
              <h3 style={{ fontWeight: 900, fontSize: '1.4rem', color: 'var(--primary)' }}>No live listings found</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '6px', fontSize: '0.95rem' }}>Create an event to show up on the homepage!</p>
            </div>
          ) : (
            <div 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '20px',
                maxHeight: '650px',
                overflowY: 'auto',
                paddingRight: '12px',
                paddingBottom: '8px'
              }}
              className="custom-scrollbar"
            >
              {filteredEvents.map(event => (
                <div 
                  key={event.id}
                  className="sticker-shadow"
                  style={{ 
                    backgroundColor: 'var(--bg-white)', 
                    borderRadius: '20px', 
                    padding: '24px 32px', 
                    border: '3px solid var(--text-dark)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '20px',
                    boxShadow: '6px 6px 0px 0px var(--text-dark)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexGrow: 1, minWidth: '280px', textAlign: 'left' }}>
                    <img 
                      src={event.image_url || 'https://images.unsplash.com/photo-1596464716127-f2a82984de30?auto=format&fit=crop&w=150&q=80'} 
                      alt="" 
                      style={{ 
                        width: '70px', 
                        height: '70px', 
                        borderRadius: '12px', 
                        objectFit: 'cover',
                        border: '2px solid var(--text-dark)'
                      }}
                    />
                    <div>
                      <span style={{ 
                        backgroundColor: 'var(--primary-soft)', 
                        color: 'var(--primary)', 
                        fontSize: '0.72rem', 
                        padding: '4px 12px', 
                        marginBottom: '8px',
                        borderRadius: '6px',
                        border: '2px solid var(--text-dark)',
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        display: 'inline-block'
                      }}>
                        {event.category || 'General'}
                      </span>
                      <h4 style={{ fontWeight: 900, fontSize: '1.2rem', color: 'var(--primary)', margin: 0 }}>{event.title}</h4>
                      
                      <div style={{ display: 'flex', gap: '16px', fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '8px', fontWeight: '700' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={13} style={{ color: 'var(--secondary)' }} /> {event.date && !isNaN(new Date(event.date).getTime()) ? new Date(event.date).toLocaleDateString('en-AU') : 'Flexible'}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={13} style={{ color: 'var(--secondary)' }} /> {event.location?.split(',')[0]}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions column */}
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <Link 
                      to={`/admin/events/${event.id}/edit`} 
                      style={{ 
                        padding: '10px 18px', 
                        fontSize: '0.85rem', 
                        fontWeight: '800',
                        backgroundColor: 'var(--bg-white)',
                        color: 'var(--text-dark)',
                        border: '3.5px solid var(--text-dark)',
                        borderRadius: '50px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        boxShadow: '3px 3px 0px 0px var(--text-dark)',
                        transition: 'var(--transition-bouncy)'
                      }}
                      className="admin-list-btn"
                    >
                      <Edit2 size={14} /> Edit
                    </Link>
                    <button 
                      onClick={() => handleDeleteEvent(event)} 
                      style={{ 
                        padding: '10px 18px', 
                        fontSize: '0.85rem', 
                        fontWeight: '800',
                        backgroundColor: 'var(--bg-white)',
                        color: 'hsl(0, 80%, 40%)',
                        border: '3.5px solid var(--text-dark)',
                        borderRadius: '50px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        boxShadow: '3px 3px 0px 0px var(--text-dark)',
                        transition: 'var(--transition-bouncy)'
                      }}
                      className="admin-list-btn"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'posts' ? (

        /* Tab: Blog Posts List */
        <div>
          {/* Search Posts box */}
          <div style={{ position: 'relative', maxWidth: '440px', marginBottom: '32px' }}>
            <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
            <input 
              type="text" 
              placeholder="Search blog posts..." 
              className="form-control"
              style={{ 
                paddingLeft: '48px',
                border: '3px solid var(--text-dark)',
                borderRadius: '50px',
                backgroundColor: 'var(--bg-white)',
                boxShadow: 'none',
                height: '48px'
              }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {filteredPosts.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '64px 24px', 
              backgroundColor: 'var(--bg-white)', 
              borderRadius: '24px', 
              border: '3px dashed var(--text-dark)',
              boxShadow: '6px 6px 0px 0px var(--text-dark)'
            }}>
              <BookOpen size={48} style={{ color: 'var(--secondary)', marginBottom: '16px' }} />
              <h3 style={{ fontWeight: 900, fontSize: '1.4rem', color: 'var(--primary)' }}>No blog posts found</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '6px', fontSize: '0.95rem' }}>Write a parenting review or guide to share with the community!</p>
            </div>
          ) : (
            <div 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '20px',
                maxHeight: '650px',
                overflowY: 'auto',
                paddingRight: '12px',
                paddingBottom: '8px'
              }}
              className="custom-scrollbar"
            >
              {filteredPosts.map(post => (
                <div 
                  key={post.id}
                  className="sticker-shadow"
                  style={{ 
                    backgroundColor: 'var(--bg-white)', 
                    borderRadius: '20px', 
                    padding: '24px 32px', 
                    border: '3px solid var(--text-dark)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '20px',
                    boxShadow: '6px 6px 0px 0px var(--text-dark)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexGrow: 1, minWidth: '280px', textAlign: 'left' }}>
                    <img 
                      src={post.image_url || 'https://images.unsplash.com/photo-1502082553048-f2a82984de30?auto=format&fit=crop&w=150&q=80'} 
                      alt="" 
                      style={{ 
                        width: '70px', 
                        height: '70px', 
                        borderRadius: '12px', 
                        objectFit: 'cover',
                        border: '2px solid var(--text-dark)'
                      }}
                    />
                    <div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ 
                          backgroundColor: 'var(--secondary-soft)', 
                          color: 'var(--secondary)', 
                          fontSize: '0.72rem', 
                          padding: '4px 12px', 
                          borderRadius: '6px',
                          border: '2px solid var(--text-dark)',
                          fontWeight: '800',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          {post.category || 'Review'}
                        </span>
                        {post.is_published ? (
                          <span style={{ 
                            backgroundColor: 'var(--primary-soft)', 
                            color: 'var(--primary)', 
                            fontSize: '0.65rem', 
                            padding: '3px 8px', 
                            fontWeight: '800',
                            borderRadius: '4px',
                            border: '1.5px solid var(--primary)',
                            textTransform: 'uppercase'
                          }}>Live</span>
                        ) : (
                          <span style={{ 
                            backgroundColor: 'var(--yellow-soft)', 
                            color: 'hsl(14, 90%, 35%)', 
                            fontSize: '0.65rem', 
                            padding: '3px 8px', 
                            fontWeight: '800',
                            borderRadius: '4px',
                            border: '1.5px solid var(--yellow)',
                            textTransform: 'uppercase'
                          }}>Draft</span>
                        )}
                      </div>
                      <h4 style={{ fontWeight: 900, fontSize: '1.2rem', color: 'var(--primary)', margin: 0 }}>{post.title}</h4>
                      
                      <div style={{ display: 'flex', gap: '16px', fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '8px', fontWeight: '700' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={13} style={{ color: 'var(--secondary)' }} /> {post.date && !isNaN(new Date(post.date).getTime()) ? new Date(post.date).toLocaleDateString('en-AU') : 'Flexible'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions column */}
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <Link 
                      to={`/admin/blog/${post.id}/edit`} 
                      style={{ 
                        padding: '10px 18px', 
                        fontSize: '0.85rem', 
                        fontWeight: '800',
                        backgroundColor: 'var(--bg-white)',
                        color: 'var(--text-dark)',
                        border: '3.5px solid var(--text-dark)',
                        borderRadius: '50px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        boxShadow: '3px 3px 0px 0px var(--text-dark)',
                        transition: 'var(--transition-bouncy)'
                      }}
                      className="admin-list-btn"
                    >
                      <Edit2 size={14} /> Edit
                    </Link>
                    <button 
                      onClick={() => handleDeletePost(post.id)} 
                      style={{ 
                        padding: '10px 18px', 
                        fontSize: '0.85rem', 
                        fontWeight: '800',
                        backgroundColor: 'var(--bg-white)',
                        color: 'hsl(0, 80%, 40%)',
                        border: '3.5px solid var(--text-dark)',
                        borderRadius: '50px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        boxShadow: '3px 3px 0px 0px var(--text-dark)',
                        transition: 'var(--transition-bouncy)'
                      }}
                      className="admin-list-btn"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

      ) : (
        
        /* Tab: Suggested Scrapes List */
        <div>
          <div 
            className="sticker-shadow"
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              flexWrap: 'wrap', 
              gap: '24px', 
              textAlign: 'left', 
              marginBottom: '36px', 
              backgroundColor: 'var(--bg-white)', 
              padding: '32px', 
              borderRadius: '24px', 
              border: '3.5px solid var(--text-dark)',
              boxShadow: '6px 6px 0px 0px var(--text-dark)'
            }}
          >
            <div style={{ flex: '1 1 500px' }}>
              <h4 style={{ 
                fontFamily: 'var(--font-display)',
                fontWeight: 900, 
                color: 'var(--primary)',
                fontSize: '1.4rem',
                margin: 0
              }}>
                Collate & Approve Recommended Event Leads
              </h4>
              <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', marginTop: '8px', fontWeight: '600', lineHeight: 1.5 }}>
                These are free family activities identified on local Central Coast pages. Review the event parameters and click Approve to push them live to the website!
              </p>
            </div>
            <div>
              <button 
                onClick={handleRunScraper} 
                disabled={scraping}
                style={{ 
                  padding: '14px 28px', 
                  fontSize: '0.9rem', 
                  fontWeight: '800',
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  backgroundColor: scraping ? 'var(--bg-cream)' : 'var(--secondary)',
                  border: '3.5px solid var(--text-dark)',
                  color: scraping ? 'var(--text-muted)' : 'white',
                  borderRadius: '50px',
                  cursor: 'pointer',
                  boxShadow: scraping ? 'none' : '3px 3px 0px 0px var(--text-dark)',
                  transition: 'var(--transition-bouncy)'
                }}
                className="scraper-btn-glow"
              >
                {scraping ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} /> Crawling Feeds...
                  </>
                ) : (
                  <>
                    <Cpu size={16} /> Run Scraper Now
                  </>
                )}
              </button>
            </div>
          </div>

          {suggestions.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '64px 24px', 
              backgroundColor: 'var(--bg-white)', 
              borderRadius: '24px', 
              border: '3px dashed var(--text-dark)',
              boxShadow: '6px 6px 0px 0px var(--text-dark)'
            }}>
              <Smile size={48} style={{ color: 'var(--secondary)', marginBottom: '16px' }} />
              <h3 style={{ fontWeight: 900, fontSize: '1.4rem', color: 'var(--primary)' }}>No scraper suggestions at this time</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '6px', fontSize: '0.95rem' }}>When the scraper is executed from the portal, findings will appear here.</p>
            </div>
          ) : (
            <div 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '28px',
                maxHeight: '650px',
                overflowY: 'auto',
                paddingRight: '12px',
                paddingBottom: '8px'
              }}
              className="custom-scrollbar"
            >
              {suggestions.map(s => (
                <div 
                  key={s.id}
                  className="sticker-shadow"
                  style={{ 
                    backgroundColor: 'var(--bg-white)', 
                    borderRadius: '24px', 
                    padding: '32px', 
                    border: '3.5px solid var(--text-dark)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                    textAlign: 'left',
                    boxShadow: '6px 6px 0px 0px var(--text-dark)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                      <span style={{ 
                        backgroundColor: s.source === 'User Suggestion' ? 'var(--primary-soft)' : 'var(--yellow-soft)', 
                        color: s.source === 'User Suggestion' ? 'var(--primary)' : 'hsl(14, 90%, 30%)', 
                        padding: '4px 14px', 
                        borderRadius: '6px',
                        border: '2px solid var(--text-dark)',
                        fontWeight: '800',
                        fontSize: '0.72rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        display: 'inline-block',
                        marginBottom: '10px'
                      }}>
                        {s.source === 'User Suggestion' ? 'User Submitted Suggestion' : 'Recommended Lead'}
                      </span>
                      <h3 style={{ 
                        fontFamily: 'var(--font-display)',
                        fontWeight: 900, 
                        fontSize: '1.4rem', 
                        color: 'var(--primary)',
                        margin: 0
                      }}>{s.title}</h3>
                    </div>
                    
                    {/* Approve/Edit/Dismiss Actions */}
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <button 
                        onClick={() => handleApproveSuggestion(s)} 
                        style={{ 
                          padding: '10px 20px', 
                          fontSize: '0.85rem', 
                          fontWeight: '800',
                          backgroundColor: 'var(--primary)',
                          color: 'white',
                          border: '3.5px solid var(--text-dark)',
                          borderRadius: '50px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          boxShadow: '3px 3px 0px 0px var(--text-dark)',
                          transition: 'var(--transition-bouncy)'
                        }}
                        className="admin-list-btn"
                      >
                        <CheckCircle size={16} /> Approve
                      </button>
                      <button 
                        onClick={() => setEditingSuggestion(s)} 
                        style={{ 
                          padding: '10px 20px', 
                          fontSize: '0.85rem', 
                          fontWeight: '800',
                          backgroundColor: 'var(--bg-white)',
                          color: 'var(--primary)',
                          border: '3.5px solid var(--text-dark)',
                          borderRadius: '50px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          boxShadow: '3px 3px 0px 0px var(--text-dark)',
                          transition: 'var(--transition-bouncy)'
                        }}
                        className="admin-list-btn"
                      >
                        <Edit2 size={16} /> Edit
                      </button>
                      <button 
                        onClick={() => handleRejectSuggestion(s.id)} 
                        style={{ 
                          padding: '10px 20px', 
                          fontSize: '0.85rem', 
                          fontWeight: '800',
                          backgroundColor: 'var(--bg-white)',
                          color: 'hsl(0, 80%, 40%)',
                          border: '3.5px solid var(--text-dark)',
                          borderRadius: '50px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          boxShadow: '3px 3px 0px 0px var(--text-dark)',
                          transition: 'var(--transition-bouncy)'
                        }}
                        className="admin-list-btn"
                      >
                        <XCircle size={16} /> Dismiss
                      </button>
                    </div>
                  </div>
 
                  {/* Lead parameters summary */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                    gap: '16px', 
                    fontSize: '0.9rem', 
                    color: 'var(--text-dark)', 
                    backgroundColor: 'var(--primary-soft)', 
                    padding: '20px', 
                    borderRadius: '16px',
                    border: '2px solid var(--text-dark)',
                    fontWeight: '700'
                  }}>
                    <div><strong>Date:</strong> {s.date || 'Flexible'}</div>
                    <div><strong>Time:</strong> {s.time || 'Not specified'}</div>
                    <div><strong>Location:</strong> {s.location || 'Not specified'}</div>
                    <div><strong>Category:</strong> {s.category || 'General'}</div>
                  </div>
 
                  <div>
                    <h5 style={{ fontWeight: 900, fontSize: '1rem', color: 'var(--primary)', marginBottom: '8px' }}>Extracted Summary</h5>
                    <p style={{ fontSize: '0.95rem', color: 'var(--text-dark)', lineHeight: '1.6', margin: 0 }}>{s.description}</p>
                  </div>
 
                  {s.link && (
                    <a 
                      href={s.link} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ 
                        fontSize: '0.85rem', 
                        color: 'var(--secondary)', 
                        fontWeight: '800', 
                        textDecoration: 'underline',
                        alignSelf: 'flex-start'
                      }}
                    >
                      View original source link
                    </a>
                  )}
 
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      </div>
        
        {/* Right Column: Sidebar (Spans 4 columns) */}
        <div 
          className="admin-sidebar-col"
          style={{ 
            gridColumn: 'span 4 / span 4', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '24px'
          }}
        >
          {/* Quick Launch Panel */}
          <div 
            style={{ 
              backgroundColor: 'var(--bg-white)', 
              borderRadius: '24px', 
              border: '3px solid var(--text-dark)', 
              padding: '24px',
              boxShadow: '6px 6px 0px 0px var(--text-dark)',
              textAlign: 'left'
            }}
            className="sticker-shadow"
          >
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: '900', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 20px 0' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--secondary)' }}>bolt</span>
              Quick Launch
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Link 
                to="/admin/events/new"
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  padding: '16px 8px', 
                  backgroundColor: 'var(--bg-cream)', 
                  borderRadius: '16px', 
                  border: '2px solid var(--text-dark)',
                  cursor: 'pointer',
                  transition: 'var(--transition-bouncy)'
                }}
                className="quick-launch-btn hover-bg-secondary"
              >
                <Plus size={24} style={{ marginBottom: '4px', color: 'var(--secondary)' }} />
                <span style={{ fontSize: '0.68rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Create Event</span>
              </Link>
              
              <Link 
                to="/admin/blog/new"
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  padding: '16px 8px', 
                  backgroundColor: 'var(--bg-cream)', 
                  borderRadius: '16px', 
                  border: '2px solid var(--text-dark)',
                  cursor: 'pointer',
                  transition: 'var(--transition-bouncy)'
                }}
                className="quick-launch-btn hover-bg-tertiary"
              >
                <BookOpen size={24} style={{ marginBottom: '4px', color: 'var(--primary)' }} />
                <span style={{ fontSize: '0.68rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Write Blog</span>
              </Link>

              <Link 
                to="/admin/newsletter"
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  padding: '16px 8px', 
                  backgroundColor: 'var(--bg-cream)', 
                  borderRadius: '16px', 
                  border: '2px solid var(--text-dark)',
                  cursor: 'pointer',
                  transition: 'var(--transition-bouncy)'
                }}
                className="quick-launch-btn hover-bg-yellow"
              >
                <Mail size={24} style={{ marginBottom: '4px', color: 'var(--yellow)' }} />
                <span style={{ fontSize: '0.68rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Newsletter</span>
              </Link>

              <Link 
                to="/admin/analytics"
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  padding: '16px 8px', 
                  backgroundColor: 'var(--bg-cream)', 
                  borderRadius: '16px', 
                  border: '2px solid var(--text-dark)',
                  cursor: 'pointer',
                  transition: 'var(--transition-bouncy)'
                }}
                className="quick-launch-btn hover-bg-teal"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '24px', marginBottom: '4px', color: 'var(--teal-soft)' }}>monitoring</span>
                <span style={{ fontSize: '0.68rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Analytics</span>
              </Link>

              <button 
                onClick={handleLogout}
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  padding: '16px 8px', 
                  backgroundColor: 'var(--bg-cream)', 
                  borderRadius: '16px', 
                  border: '2px solid var(--text-dark)',
                  cursor: 'pointer',
                  transition: 'var(--transition-bouncy)',
                  gridColumn: 'span 2'
                }}
                className="quick-launch-btn hover-bg-danger"
              >
                <LogOut size={24} style={{ marginBottom: '4px', color: 'hsl(0, 75%, 45%)' }} />
                <span style={{ fontSize: '0.68rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sign Out</span>
              </button>
            </div>
          </div>


        </div>

      </div>

      {/* Editing Suggestion Modal */}
      {editingSuggestion && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(27, 19, 44, 0.65)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '20px',
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-white)',
            border: '4px solid var(--text-dark)',
            borderRadius: '24px',
            padding: '32px',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '8px 8px 0px 0px var(--text-dark)',
            animation: 'slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}>
            <h3 style={{ fontWeight: '900', fontSize: '1.6rem', color: 'var(--primary)', marginBottom: '20px', textAlign: 'left' }}>
              Edit Event Suggestion
            </h3>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                // Update Firestore
                const docRef = doc(db, 'suggestions', editingSuggestion.id);
                await updateDoc(docRef, {
                  title: editingSuggestion.title,
                  date: editingSuggestion.date || '',
                  time: editingSuggestion.time || '',
                  location: editingSuggestion.location || '',
                  category: editingSuggestion.category || 'General',
                  age_group: editingSuggestion.age_group || 'All Ages',
                  description: editingSuggestion.description || '',
                  link: editingSuggestion.link || '',
                  image_url: editingSuggestion.image_url || '',
                  is_featured: editingSuggestion.is_featured || false
                });
                
                // Update local state
                setSuggestions(prev => prev.map(s => s.id === editingSuggestion.id ? editingSuggestion : s));
                
                alert("Suggestion updated successfully!");
                setEditingSuggestion(null);
              } catch (err) {
                console.error("Error updating suggestion:", err);
                alert("Failed to update suggestion: " + err.message);
              }
            }} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: '800' }}>Activity Title *</label>
                <input 
                  type="text" 
                  className="form-control"
                  style={{ border: '2.5px solid var(--text-dark)', borderRadius: '12px', padding: '12px' }}
                  value={editingSuggestion.title}
                  onChange={(e) => setEditingSuggestion(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: '800' }}>Date</label>
                  <input 
                    type="date" 
                    className="form-control"
                    style={{ border: '2.5px solid var(--text-dark)', borderRadius: '12px', padding: '12px' }}
                    value={editingSuggestion.date || ''}
                    onChange={(e) => setEditingSuggestion(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: '800' }}>Time Slot</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Start Time</label>
                      <select 
                        className="form-control"
                        style={{ border: '2.5px solid var(--text-dark)', borderRadius: '12px', height: '48px', padding: '0 12px' }}
                        value={sugStartTime}
                        onChange={(e) => handleSuggestionTimeChange('start', e.target.value)}
                      >
                        {sugStartOptions.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>End Time</label>
                      <select 
                        className="form-control"
                        style={{ border: '2.5px solid var(--text-dark)', borderRadius: '12px', height: '48px', padding: '0 12px' }}
                        value={sugEndTime}
                        onChange={(e) => handleSuggestionTimeChange('end', e.target.value)}
                      >
                        {sugEndOptions.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: '800' }}>Location *</label>
                <input 
                  type="text" 
                  className="form-control"
                  style={{ border: '2.5px solid var(--text-dark)', borderRadius: '12px', padding: '12px' }}
                  value={editingSuggestion.location}
                  onChange={(e) => setEditingSuggestion(prev => ({ ...prev, location: e.target.value }))}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: '800' }}>Category</label>
                  <select 
                    className="form-control"
                    style={{ border: '2.5px solid var(--text-dark)', borderRadius: '12px', padding: '12px', height: '48px' }}
                    value={editingSuggestion.category || 'Playgrounds'}
                    onChange={(e) => setEditingSuggestion(prev => ({ ...prev, category: e.target.value }))}
                  >
                    {['School Holidays', 'Weekend Activities', 'Weekday Activities', 'Markets', 'Playgrounds', 'Indoor Activities', 'Playgroups'].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: '800' }}>Age Suitability</label>
                  <select 
                    className="form-control"
                    style={{ border: '2.5px solid var(--text-dark)', borderRadius: '12px', padding: '12px', height: '48px' }}
                    value={editingSuggestion.age_group || 'All Ages'}
                    onChange={(e) => setEditingSuggestion(prev => ({ ...prev, age_group: e.target.value }))}
                  >
                    {['0-5 years', '6-12 years', 'Teens', 'All Ages'].map(age => (
                      <option key={age} value={age}>{age}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: '800' }}>Event Image / Photo</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* File Upload Box */}
                  <div style={{ 
                    padding: '16px', 
                    border: '2.5px dashed var(--border-soft)', 
                    borderRadius: '16px', 
                    backgroundColor: 'var(--bg-cream)', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '10px' 
                  }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-dark)' }}>Upload Photo from Device</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleSuggestionImageUpload} 
                      disabled={uploadingImage} 
                      style={{ fontSize: '0.85rem' }}
                    />
                    {uploadingImage && (
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '700', marginBottom: '2px' }}>
                          <span>Uploading to Storage...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div style={{ height: '6px', width: '100%', backgroundColor: 'var(--border-soft)', borderRadius: '50px', overflow: 'hidden' }}>
                          <div style={{ 
                            height: '100%', 
                            width: `${uploadProgress}%`, 
                            backgroundColor: 'var(--primary)', 
                            transition: 'width 0.2s ease' 
                          }} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', margin: '4px 0', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>
                    <div style={{ height: '1px', flexGrow: 1, backgroundColor: 'var(--border-soft)' }} />
                    <span>OR ENTER IMAGE URL</span>
                    <div style={{ height: '1px', flexGrow: 1, backgroundColor: 'var(--border-soft)' }} />
                  </div>

                  <input 
                    type="url" 
                    placeholder="Paste Image URL (https://...)"
                    className="form-control"
                    style={{ border: '2.5px solid var(--text-dark)', borderRadius: '12px', padding: '12px' }}
                    value={editingSuggestion.image_url || ''}
                    onChange={(e) => setEditingSuggestion(prev => ({ ...prev, image_url: e.target.value }))}
                  />

                  {editingSuggestion.image_url && (
                    <div style={{ marginTop: '8px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Image Preview:</span>
                      <img 
                        src={editingSuggestion.image_url} 
                        alt="Preview" 
                        style={{ width: '120px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '2px solid var(--text-dark)' }} 
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: '800' }}>Website / Social Link</label>
                <input 
                  type="url" 
                  className="form-control"
                  style={{ border: '2.5px solid var(--text-dark)', borderRadius: '12px', padding: '12px' }}
                  value={editingSuggestion.link || ''}
                  onChange={(e) => setEditingSuggestion(prev => ({ ...prev, link: e.target.value }))}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: '800' }}>Description / Details *</label>
                <textarea 
                  className="form-control"
                  style={{ border: '2.5px solid var(--text-dark)', borderRadius: '12px', padding: '12px', minHeight: '80px' }}
                  value={editingSuggestion.description}
                  onChange={(e) => setEditingSuggestion(prev => ({ ...prev, description: e.target.value }))}
                  required
                />
              </div>

              {/* Flag as Featured Event Toggle */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                padding: '12px 16px', 
                borderRadius: '12px', 
                backgroundColor: 'var(--primary-soft)', 
                border: '2.5px solid var(--text-dark)',
                marginTop: '4px'
              }}>
                <input 
                  type="checkbox" 
                  id="is_featured_suggestion" 
                  checked={editingSuggestion.is_featured || false}
                  onChange={(e) => setEditingSuggestion(prev => ({ ...prev, is_featured: e.target.checked }))}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
                <label htmlFor="is_featured_suggestion" style={{ fontWeight: '800', fontSize: '0.85rem', color: 'var(--text-dark)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--primary)' }}>grade</span>
                  Flag as Featured Event (Highlights at top of homepage)
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  style={{ padding: '10px 20px', border: '2px solid var(--text-dark)', borderRadius: '50px' }}
                  onClick={() => setEditingSuggestion(null)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-outline"
                  style={{ padding: '10px 24px', border: '2px solid var(--text-dark)', borderRadius: '50px', color: 'var(--primary)' }}
                >
                  Save Draft
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handleApproveAndPublishEditedSuggestion}
                  style={{ padding: '10px 24px', backgroundColor: 'var(--primary)', color: 'white', border: '2px solid var(--text-dark)', borderRadius: '50px' }}
                >
                  Approve & Publish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin specific styles */}
      <style>{`
        .admin-action-btn:hover, .admin-tab-btn:hover, .admin-list-btn:hover, .scraper-btn-glow:hover, .reward-btn:hover {
          transform: translate(-3px, -3px) !important;
          box-shadow: 6px 6px 0px 0px var(--text-dark) !important;
        }
        
        .quick-launch-btn {
          color: var(--text-dark) !important;
        }

        .quick-launch-btn:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 3px 3px 0px 0px var(--text-dark);
        }
        
        .hover-bg-secondary:hover {
          background-color: var(--secondary-soft) !important;
        }
        
        .hover-bg-tertiary:hover {
          background-color: var(--primary-soft) !important;
        }
        
        .hover-bg-yellow:hover {
          background-color: var(--yellow-soft) !important;
        }
        
        .hover-bg-primary:hover {
          background-color: var(--secondary-soft) !important;
        }
        
        .hover-bg-teal:hover {
          background-color: hsl(174, 70%, 92%) !important;
        }
        
        .hover-bg-danger:hover {
          background-color: hsl(0, 100%, 94%) !important;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 1024px) {
          .analytics-grid {
            grid-template-columns: 1fr !important;
          }
          .analytics-grid > div {
            grid-column: span 12 / span 12 !important;
          }
          .admin-workspace-grid {
            grid-template-columns: 1fr !important;
          }
          .admin-content-col {
            grid-column: span 12 / span 12 !important;
          }
          .admin-sidebar-col {
            grid-column: span 12 / span 12 !important;
          }
        }
      `}</style>
 
    </div>
  );
}

