import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, getDocs, doc, query, orderBy } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../firebase';
import { ArrowLeft, Calendar, BookOpen, BarChart3, TrendingUp, Users, Award, Eye, Award as AwardIcon } from 'lucide-react';

export default function AdminAnalytics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [events, setEvents] = useState([]);
  const [posts, setPosts] = useState([]);
  const [visits, setVisits] = useState([]);
  const [monthlyClicks, setMonthlyClicks] = useState([]);

  // Computed Metrics
  const [metrics, setMetrics] = useState({
    daily: 0,
    weekly: 0,
    monthly: 0,
    allTime: 0
  });

  const [topEventAllTime, setTopEventAllTime] = useState(null);
  const [topPostAllTime, setTopPostAllTime] = useState(null);
  const [topEventThisMonth, setTopEventThisMonth] = useState(null);
  const [topPostThisMonth, setTopPostThisMonth] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState({});

  // Route protection
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/admin/login');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Load analytics data
  useEffect(() => {
    async function loadAnalytics() {
      try {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const currentYearMonth = `${yyyy}-${mm}`;

        // 1. Fetch Events
        const eventsCol = collection(db, 'events');
        const eq = query(eventsCol, orderBy('date', 'asc'));
        const eventSnapshot = await getDocs(eq);
        const fetchedEvents = eventSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setEvents(fetchedEvents);

        // 2. Fetch Posts
        const postsCol = collection(db, 'posts');
        const pq = query(postsCol, orderBy('date', 'desc'));
        const postSnapshot = await getDocs(pq);
        const fetchedPosts = postSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPosts(fetchedPosts);

        // 3. Fetch Visits
        const visitsCol = collection(db, 'analytics_visits');
        const visitSnapshot = await getDocs(visitsCol);
        const visitData = visitSnapshot.docs.map(doc => ({ id: doc.id, visits: doc.data().visits || 0 }));
        setVisits(visitData);

        // 4. Fetch Monthly Clicks
        const clicksCol = collection(db, 'analytics_monthly_clicks');
        const clickSnapshot = await getDocs(clicksCol);
        const clickData = clickSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMonthlyClicks(clickData);

        // -- Calculate Overview Metrics --
        // Daily
        const todayDoc = visitData.find(v => v.id === todayStr);
        const dailyCount = todayDoc ? todayDoc.visits : 0;

        // Weekly (Last 7 days)
        const past7Days = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date();
          d.setDate(today.getDate() - i);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          past7Days.push(`${y}-${m}-${day}`);
        }
        const weeklyCount = visitData
          .filter(v => past7Days.includes(v.id))
          .reduce((sum, v) => sum + v.visits, 0);

        // Monthly (Current calendar month)
        const monthlyCount = visitData
          .filter(v => v.id.startsWith(currentYearMonth))
          .reduce((sum, v) => sum + v.visits, 0);

        // All Time visits
        const allTimeCount = visitData.reduce((sum, v) => sum + v.visits, 0);

        setMetrics({
          daily: dailyCount,
          weekly: weeklyCount,
          monthly: monthlyCount,
          allTime: allTimeCount
        });

        // -- Calculate Top All-Time Performers --
        const sortedEventsAllTime = [...fetchedEvents].sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
        setTopEventAllTime(sortedEventsAllTime.length > 0 && sortedEventsAllTime[0].clicks > 0 ? sortedEventsAllTime[0] : null);

        const sortedPostsAllTime = [...fetchedPosts].sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
        setTopPostAllTime(sortedPostsAllTime.length > 0 && sortedPostsAllTime[0].clicks > 0 ? sortedPostsAllTime[0] : null);

        // -- Calculate Top Monthly Performers --
        const currentMonthClicks = clickData.filter(c => c.month === currentYearMonth);
        
        const monthlyEvents = currentMonthClicks.filter(c => c.itemType === 'event');
        const sortedMonthlyEvents = [...monthlyEvents].sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
        if (sortedMonthlyEvents.length > 0) {
          const matchingEvent = fetchedEvents.find(e => e.id === sortedMonthlyEvents[0].itemId);
          setTopEventThisMonth(matchingEvent ? { ...matchingEvent, monthlyClicks: sortedMonthlyEvents[0].clicks } : { title: 'Deleted/Unknown Event', monthlyClicks: sortedMonthlyEvents[0].clicks });
        } else {
          setTopEventThisMonth(null);
        }

        const monthlyPosts = currentMonthClicks.filter(c => c.itemType === 'post');
        const sortedMonthlyPosts = [...monthlyPosts].sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
        if (sortedMonthlyPosts.length > 0) {
          const matchingPost = fetchedPosts.find(p => p.id === sortedMonthlyPosts[0].itemId);
          setTopPostThisMonth(matchingPost ? { ...matchingPost, monthlyClicks: sortedMonthlyPosts[0].clicks } : { title: 'Deleted/Unknown Post', monthlyClicks: sortedMonthlyPosts[0].clicks });
        } else {
          setTopPostThisMonth(null);
        }

        // -- Calculate 30-Day Trend Data --
        const past30Days = [];
        for (let i = 29; i >= 0; i--) {
          const d = new Date();
          d.setDate(today.getDate() - i);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const dateStr = `${y}-${m}-${day}`;
          
          const matchDoc = visitData.find(v => v.id === dateStr);
          past30Days.push({
            date: dateStr,
            label: `${d.getDate()} ${d.toLocaleDateString('en-AU', { month: 'short' })}`,
            visits: matchDoc ? matchDoc.visits : 0
          });
        }
        setTrendData(past30Days);

        // -- Calculate Category Breakdown --
        const counts = {};
        fetchedEvents.forEach(e => {
          const cat = e.category || 'General';
          counts[cat] = (counts[cat] || 0) + 1;
        });
        setCategoryBreakdown(counts);

      } catch (err) {
        console.error("Error loading analytics page data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0', minHeight: '100vh', backgroundColor: 'var(--bg-cream)' }}>
        <div style={{ 
          width: '50px', 
          height: '50px', 
          border: '5px solid var(--border-soft)', 
          borderTopColor: 'var(--primary)', 
          borderRadius: '50%', 
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px'
        }} />
        <p style={{ fontWeight: '800', color: 'var(--primary)' }}>Analyzing metrics...</p>
      </div>
    );
  }

  // Find max value in trend data for chart scaling
  const maxVisitsVal = Math.max(...trendData.map(t => t.visits), 10);

  // Total active events count
  const totalActiveEventsCount = events.length;

  return (
    <div style={{ 
      padding: '48px 24px', 
      maxWidth: '1280px', 
      margin: '0 auto',
      backgroundColor: 'var(--bg-cream)',
      minHeight: '100vh'
    }}>
      
      {/* Navigation & Header */}
      <div style={{ textAlign: 'left', marginBottom: '32px' }}>
        <Link 
          to="/admin/dashboard" 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px', 
            color: 'var(--text-muted)', 
            fontWeight: '700', 
            marginBottom: '20px',
            textDecoration: 'none'
          }}
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        <h1 style={{ 
          fontFamily: 'var(--font-display)', 
          fontWeight: 950, 
          fontSize: '2.5rem', 
          color: 'var(--primary)',
          margin: 0
        }}>
          Website Performance & Analytics
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '6px', fontWeight: '600' }}>
          Real-time visitor views, monthly and all-time listing clicks, and directory categories coverage.
        </p>
      </div>

      {/* 1. Overview Cards Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '24px', 
        marginBottom: '48px' 
      }}>
        {/* Daily views */}
        <div className="sticker-shadow" style={{ backgroundColor: 'var(--bg-white)', padding: '24px', borderRadius: '24px', border: '3.5px solid var(--text-dark)', boxShadow: '6px 6px 0px 0px var(--text-dark)', display: 'flex', alignItems: 'center', gap: '20px', textAlign: 'left' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: 'var(--primary-soft)', border: '2.5px solid var(--text-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
            <Eye size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '2rem', fontWeight: '900', margin: 0, color: 'var(--text-dark)' }}>{metrics.daily.toLocaleString()}</h3>
            <p style={{ margin: '2px 0 0 0', textTransform: 'uppercase', fontSize: '0.72rem', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Daily Views</p>
          </div>
        </div>

        {/* Weekly views */}
        <div className="sticker-shadow" style={{ backgroundColor: 'var(--bg-white)', padding: '24px', borderRadius: '24px', border: '3.5px solid var(--text-dark)', boxShadow: '6px 6px 0px 0px var(--text-dark)', display: 'flex', alignItems: 'center', gap: '20px', textAlign: 'left' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: 'var(--secondary-soft)', border: '2.5px solid var(--text-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--secondary)' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '2rem', fontWeight: '900', margin: 0, color: 'var(--text-dark)' }}>{metrics.weekly.toLocaleString()}</h3>
            <p style={{ margin: '2px 0 0 0', textTransform: 'uppercase', fontSize: '0.72rem', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Weekly Views (7d)</p>
          </div>
        </div>

        {/* Monthly views */}
        <div className="sticker-shadow" style={{ backgroundColor: 'var(--bg-white)', padding: '24px', borderRadius: '24px', border: '3.5px solid var(--text-dark)', boxShadow: '6px 6px 0px 0px var(--text-dark)', display: 'flex', alignItems: 'center', gap: '20px', textAlign: 'left' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: 'var(--yellow-soft)', border: '2.5px solid var(--text-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dark)' }}>
            <Calendar size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '2rem', fontWeight: '900', margin: 0, color: 'var(--text-dark)' }}>{metrics.monthly.toLocaleString()}</h3>
            <p style={{ margin: '2px 0 0 0', textTransform: 'uppercase', fontSize: '0.72rem', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Monthly Views</p>
          </div>
        </div>

        {/* All-time views */}
        <div className="sticker-shadow" style={{ backgroundColor: 'var(--bg-white)', padding: '24px', borderRadius: '24px', border: '3.5px solid var(--text-dark)', boxShadow: '6px 6px 0px 0px var(--text-dark)', display: 'flex', alignItems: 'center', gap: '20px', textAlign: 'left' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: 'var(--primary)', border: '2.5px solid var(--text-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <Users size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '2rem', fontWeight: '900', margin: 0, color: 'var(--text-dark)' }}>{metrics.allTime.toLocaleString()}</h3>
            <p style={{ margin: '2px 0 0 0', textTransform: 'uppercase', fontSize: '0.72rem', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>All-Time Views</p>
          </div>
        </div>
      </div>

      {/* 2. Visual Visits Trend Chart Section */}
      <div 
        className="sticker-shadow"
        style={{ 
          backgroundColor: 'var(--bg-white)', 
          border: '3.5px solid var(--text-dark)', 
          borderRadius: '24px', 
          padding: '36px', 
          boxShadow: '6px 6px 0px 0px var(--text-dark)',
          marginBottom: '48px',
          textAlign: 'left'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.6rem', color: 'var(--primary)', margin: 0 }}>
              Visitor Views Trend (Last 30 Days)
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontWeight: '600', marginTop: '4px' }}>
              Shows unique daily views on this browser/session. Hover over bars to view individual counts.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-dark)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', backgroundColor: 'var(--primary)', border: '1px solid var(--text-dark)', borderRadius: '3px' }} />
              Visits Count
            </span>
          </div>
        </div>

        {/* Custom SVG Bar Chart */}
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <div style={{ minWidth: '700px', height: '260px', position: 'relative' }}>
            <svg 
              width="100%" 
              height="240" 
              viewBox="0 0 800 240" 
              style={{ overflow: 'visible' }}
            >
              {/* Horizontal gridlines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                const y = 20 + 180 * (1 - ratio);
                const value = Math.round(maxVisitsVal * ratio);
                return (
                  <g key={index}>
                    <line x1="50" y1={y} x2="780" y2={y} stroke="var(--border-soft)" strokeWidth="1" strokeDasharray="4 4" />
                    <text x="15" y={y + 4} fontSize="10" fontWeight="800" fill="var(--text-muted)" textAnchor="middle">{value}</text>
                  </g>
                );
              })}

              {/* Draw Bars */}
              {trendData.map((data, index) => {
                const barWidth = 14;
                const barSpacing = (730 - barWidth * 30) / 29;
                const x = 50 + index * (barWidth + barSpacing);
                const barHeight = (data.visits / maxVisitsVal) * 180;
                const y = 200 - barHeight;
                
                const isToday = index === 29;

                return (
                  <g key={data.date} className="chart-bar-group">
                    {/* Tooltip trigger overlay */}
                    <rect 
                      x={x - barSpacing / 2} 
                      y="10" 
                      width={barWidth + barSpacing} 
                      height="200" 
                      fill="transparent" 
                      style={{ cursor: 'pointer' }}
                    />
                    
                    {/* SVG Title as simple tooltip */}
                    <title>{`${data.date}: ${data.visits} visits`}</title>

                    {/* Actual Bar */}
                    <rect 
                      x={x} 
                      y={y} 
                      width={barWidth} 
                      height={Math.max(barHeight, 3)} 
                      fill={isToday ? 'var(--secondary)' : 'var(--primary)'}
                      stroke="var(--text-dark)" 
                      strokeWidth="2.5" 
                      rx="3"
                      style={{ 
                        transition: 'all 0.3s ease',
                        transformOrigin: `${x + barWidth/2}px 200px`
                      }}
                      className="svg-bar"
                    />

                    {/* Date label underneath bar (show every 3 days to avoid crowding) */}
                    {(index % 3 === 0 || index === 29) && (
                      <text 
                        x={x + barWidth / 2} 
                        y="222" 
                        fontSize="9" 
                        fontWeight="800" 
                        fill="var(--text-muted)" 
                        textAnchor="middle"
                        transform={`rotate(-25, ${x + barWidth/2}, 222)`}
                      >
                        {data.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* 3. Leaderboards: All-Time vs Monthly Clicks */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', 
        gap: '32px',
        marginBottom: '48px',
        textAlign: 'left'
      }}>
        
        {/* Left Col: Monthly Leaderboard (This Month Only) */}
        <div className="sticker-shadow" style={{ backgroundColor: 'var(--bg-white)', border: '3.5px solid var(--text-dark)', borderRadius: '24px', padding: '32px', boxShadow: '6px 6px 0px 0px var(--text-dark)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--secondary)', fontSize: '28px' }}>workspace_premium</span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.4rem', color: 'var(--primary)', margin: 0 }}>
              Top Performers (This Month)
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Top Clicked Event This Month */}
            <div style={{ padding: '20px', borderRadius: '16px', border: '2.5px solid var(--text-dark)', backgroundColor: 'var(--yellow-soft)', display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'var(--secondary-soft)', border: '2px solid var(--text-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--secondary)', flexShrink: 0 }}>
                <Calendar size={20} />
              </div>
              <div style={{ minWidth: 0, flexGrow: 1 }}>
                <h4 style={{ fontWeight: '800', fontSize: '1.05rem', color: 'var(--text-dark)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {topEventThisMonth ? topEventThisMonth.title : "No clicks recorded"}
                </h4>
                <p style={{ margin: '4px 0 0 0', textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: '800', opacity: 0.7 }}>Most Clicked Event (Month)</p>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: '950', color: 'var(--text-dark)', whiteSpace: 'nowrap' }}>
                {topEventThisMonth ? `${topEventThisMonth.monthlyClicks || 0} clicks` : '—'}
              </div>
            </div>

            {/* Top Clicked Blog Post This Month */}
            <div style={{ padding: '20px', borderRadius: '16px', border: '2.5px solid var(--text-dark)', backgroundColor: 'var(--primary-soft)', display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'var(--yellow-soft)', border: '2px solid var(--text-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dark)', flexShrink: 0 }}>
                <BookOpen size={20} />
              </div>
              <div style={{ minWidth: 0, flexGrow: 1 }}>
                <h4 style={{ fontWeight: '800', fontSize: '1.05rem', color: 'var(--text-dark)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {topPostThisMonth ? topPostThisMonth.title : "No clicks recorded"}
                </h4>
                <p style={{ margin: '4px 0 0 0', textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: '800', opacity: 0.7 }}>Most Clicked Blog (Month)</p>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: '950', color: 'var(--text-dark)', whiteSpace: 'nowrap' }}>
                {topPostThisMonth ? `${topPostThisMonth.monthlyClicks || 0} clicks` : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: All-Time Leaderboard */}
        <div className="sticker-shadow" style={{ backgroundColor: 'var(--bg-white)', border: '3.5px solid var(--text-dark)', borderRadius: '24px', padding: '32px', boxShadow: '6px 6px 0px 0px var(--text-dark)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '28px' }}>stars</span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.4rem', color: 'var(--primary)', margin: 0 }}>
              Top Performers (All-Time)
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Top Clicked Event All Time */}
            <div style={{ padding: '20px', borderRadius: '16px', border: '2.5px solid var(--text-dark)', backgroundColor: 'var(--bg-cream)', display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'var(--primary-soft)', border: '2px solid var(--text-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
                <Award size={20} />
              </div>
              <div style={{ minWidth: 0, flexGrow: 1 }}>
                <h4 style={{ fontWeight: '800', fontSize: '1.05rem', color: 'var(--text-dark)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {topEventAllTime ? topEventAllTime.title : "No clicks recorded"}
                </h4>
                <p style={{ margin: '4px 0 0 0', textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: '800', opacity: 0.7 }}>Top Event All-Time</p>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: '950', color: 'var(--text-dark)', whiteSpace: 'nowrap' }}>
                {topEventAllTime ? `${topEventAllTime.clicks || 0} clicks` : '—'}
              </div>
            </div>

            {/* Top Clicked Blog Post All Time */}
            <div style={{ padding: '20px', borderRadius: '16px', border: '2.5px solid var(--text-dark)', backgroundColor: 'var(--bg-cream)', display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'var(--secondary-soft)', border: '2px solid var(--text-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--secondary)', flexShrink: 0 }}>
                <AwardIcon size={20} />
              </div>
              <div style={{ minWidth: 0, flexGrow: 1 }}>
                <h4 style={{ fontWeight: '800', fontSize: '1.05rem', color: 'var(--text-dark)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {topPostAllTime ? topPostAllTime.title : "No clicks recorded"}
                </h4>
                <p style={{ margin: '4px 0 0 0', textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: '800', opacity: 0.7 }}>Top Blog All-Time</p>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: '950', color: 'var(--text-dark)', whiteSpace: 'nowrap' }}>
                {topPostAllTime ? `${topPostAllTime.clicks || 0} clicks` : '—'}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 4. Directory Categories Coverage Distribution */}
      <div 
        className="sticker-shadow"
        style={{ 
          backgroundColor: 'var(--bg-white)', 
          border: '3.5px solid var(--text-dark)', 
          borderRadius: '24px', 
          padding: '36px', 
          boxShadow: '6px 6px 0px 0px var(--text-dark)',
          textAlign: 'left'
        }}
      >
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.6rem', color: 'var(--primary)', margin: 0 }}>
            Directory Category Coverage
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontWeight: '600', marginTop: '4px' }}>
            Review the distribution of active activities listed in the directory to see which categories need content generation.
          </p>
        </div>

        {totalActiveEventsCount === 0 ? (
          <div style={{ padding: '24px 0', color: 'var(--text-muted)', fontWeight: '800', textAlign: 'center' }}>
            No active events listed to analyze.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            {['Playground', 'Library', 'Art & Craft', 'Outdoors', 'Sports', 'Music & Storytime', 'General'].map(category => {
              const count = categoryBreakdown[category] || 0;
              const percentage = Math.round((count / totalActiveEventsCount) * 100);
              
              // Define custom retro colors for progress bars
              const barColors = {
                'Playground': 'var(--primary)',
                'Library': 'var(--secondary)',
                'Art & Craft': 'var(--teal)',
                'Outdoors': 'var(--yellow)',
                'Sports': 'var(--secondary-soft)',
                'Music & Storytime': 'var(--primary-soft)',
                'General': 'var(--text-muted)'
              };

              return (
                <div 
                  key={category}
                  style={{ 
                    padding: '16px 20px', 
                    borderRadius: '16px', 
                    border: '2.5px solid var(--text-dark)', 
                    backgroundColor: 'var(--bg-cream)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900', fontSize: '0.85rem', color: 'var(--text-dark)' }}>
                    <span>{category}</span>
                    <span>{count} ({percentage}%)</span>
                  </div>
                  
                  {/* Progress bar container */}
                  <div style={{ height: '14px', width: '100%', backgroundColor: 'var(--bg-white)', borderRadius: '50px', border: '2px solid var(--text-dark)', overflow: 'hidden' }}>
                    <div style={{ 
                      height: '100%', 
                      width: `${percentage}%`, 
                      backgroundColor: barColors[category] || 'var(--primary)',
                      borderRight: percentage > 0 ? '2px solid var(--text-dark)' : 'none',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        .svg-bar:hover {
          fill: var(--yellow) !important;
          transform: scaleY(1.05);
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      
    </div>
  );
}
