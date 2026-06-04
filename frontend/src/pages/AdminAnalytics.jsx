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
    <div className="analytics-page-container">
      
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
        <h1 className="analytics-page-title">
          Website Performance & Analytics
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '6px', fontWeight: '600' }}>
          Real-time visitor views, monthly and all-time listing clicks, and directory categories coverage.
        </p>
      </div>

      {/* 1. Overview Cards Grid */}
      <div className="analytics-overview-grid">
        {/* Daily views */}
        <div className="sticker-shadow analytics-overview-card">
          <div className="analytics-card-icon-container" style={{ backgroundColor: 'var(--primary-soft)', color: 'var(--primary)' }}>
            <Eye size={24} />
          </div>
          <div>
            <h3 className="analytics-card-value">{metrics.daily.toLocaleString()}</h3>
            <p className="analytics-card-label">Daily Views</p>
          </div>
        </div>

        {/* Weekly views */}
        <div className="sticker-shadow analytics-overview-card">
          <div className="analytics-card-icon-container" style={{ backgroundColor: 'var(--secondary-soft)', color: 'var(--secondary)' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <h3 className="analytics-card-value">{metrics.weekly.toLocaleString()}</h3>
            <p className="analytics-card-label">Weekly Views (7d)</p>
          </div>
        </div>

        {/* Monthly views */}
        <div className="sticker-shadow analytics-overview-card">
          <div className="analytics-card-icon-container" style={{ backgroundColor: 'var(--yellow-soft)', color: 'var(--text-dark)' }}>
            <Calendar size={24} />
          </div>
          <div>
            <h3 className="analytics-card-value">{metrics.monthly.toLocaleString()}</h3>
            <p className="analytics-card-label">Monthly Views</p>
          </div>
        </div>

        {/* All-time views */}
        <div className="sticker-shadow analytics-overview-card">
          <div className="analytics-card-icon-container" style={{ backgroundColor: 'var(--primary)', color: 'white' }}>
            <Users size={24} />
          </div>
          <div>
            <h3 className="analytics-card-value">{metrics.allTime.toLocaleString()}</h3>
            <p className="analytics-card-label">All-Time Views</p>
          </div>
        </div>
      </div>

      {/* 2. Visual Visits Trend Chart Section */}
      <div className="sticker-shadow analytics-section-card">
        <div className="analytics-section-header">
          <div>
            <h2 className="analytics-section-title">
              Visitor Views Trend (Last 30 Days)
            </h2>
            <p className="analytics-section-subtitle">
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
      <div className="analytics-leaderboard-grid">
        
        {/* Left Col: Monthly Leaderboard (This Month Only) */}
        <div className="sticker-shadow analytics-section-card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--secondary)', fontSize: '28px' }}>workspace_premium</span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.4rem', color: 'var(--primary)', margin: 0 }}>
              Top Performers (This Month)
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Top Clicked Event This Month */}
            <div className="analytics-leaderboard-item" style={{ backgroundColor: 'var(--yellow-soft)' }}>
              <div className="analytics-leaderboard-icon" style={{ backgroundColor: 'var(--secondary-soft)', color: 'var(--secondary)' }}>
                <Calendar size={20} />
              </div>
              <div style={{ minWidth: 0, flexGrow: 1 }}>
                <h4 className="analytics-leaderboard-title">
                  {topEventThisMonth ? topEventThisMonth.title : "No clicks recorded"}
                </h4>
                <p className="analytics-leaderboard-desc">Most Clicked Event (Month)</p>
              </div>
              <div className="analytics-leaderboard-clicks">
                {topEventThisMonth ? `${topEventThisMonth.monthlyClicks || 0} clicks` : '—'}
              </div>
            </div>

            {/* Top Clicked Blog Post This Month */}
            <div className="analytics-leaderboard-item" style={{ backgroundColor: 'var(--primary-soft)' }}>
              <div className="analytics-leaderboard-icon" style={{ backgroundColor: 'var(--yellow-soft)', color: 'var(--text-dark)' }}>
                <BookOpen size={20} />
              </div>
              <div style={{ minWidth: 0, flexGrow: 1 }}>
                <h4 className="analytics-leaderboard-title">
                  {topPostThisMonth ? topPostThisMonth.title : "No clicks recorded"}
                </h4>
                <p className="analytics-leaderboard-desc">Most Clicked Blog (Month)</p>
              </div>
              <div className="analytics-leaderboard-clicks">
                {topPostThisMonth ? `${topPostThisMonth.monthlyClicks || 0} clicks` : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: All-Time Leaderboard */}
        <div className="sticker-shadow analytics-section-card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '28px' }}>stars</span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.4rem', color: 'var(--primary)', margin: 0 }}>
              Top Performers (All-Time)
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Top Clicked Event All Time */}
            <div className="analytics-leaderboard-item" style={{ backgroundColor: 'var(--bg-cream)' }}>
              <div className="analytics-leaderboard-icon" style={{ backgroundColor: 'var(--primary-soft)', color: 'var(--primary)' }}>
                <Award size={20} />
              </div>
              <div style={{ minWidth: 0, flexGrow: 1 }}>
                <h4 className="analytics-leaderboard-title">
                  {topEventAllTime ? topEventAllTime.title : "No clicks recorded"}
                </h4>
                <p className="analytics-leaderboard-desc">Top Event All-Time</p>
              </div>
              <div className="analytics-leaderboard-clicks">
                {topEventAllTime ? `${topEventAllTime.clicks || 0} clicks` : '—'}
              </div>
            </div>

            {/* Top Clicked Blog Post All Time */}
            <div className="analytics-leaderboard-item" style={{ backgroundColor: 'var(--bg-cream)' }}>
              <div className="analytics-leaderboard-icon" style={{ backgroundColor: 'var(--secondary-soft)', color: 'var(--secondary)' }}>
                <AwardIcon size={20} />
              </div>
              <div style={{ minWidth: 0, flexGrow: 1 }}>
                <h4 className="analytics-leaderboard-title">
                  {topPostAllTime ? topPostAllTime.title : "No clicks recorded"}
                </h4>
                <p className="analytics-leaderboard-desc">Top Blog All-Time</p>
              </div>
              <div className="analytics-leaderboard-clicks">
                {topPostAllTime ? `${topPostAllTime.clicks || 0} clicks` : '—'}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 4. Directory Categories Coverage Distribution */}
      <div className="sticker-shadow analytics-section-card">
        <div style={{ marginBottom: '24px' }}>
          <h2 className="analytics-section-title">
            Directory Category Coverage
          </h2>
          <p className="analytics-section-subtitle">
            Review the distribution of active activities listed in the directory to see which categories need content generation.
          </p>
        </div>

        {totalActiveEventsCount === 0 ? (
          <div style={{ padding: '24px 0', color: 'var(--text-muted)', fontWeight: '800', textAlign: 'center' }}>
            No active events listed to analyze.
          </div>
        ) : (
          <div className="analytics-category-grid">
            {['School Holidays', 'Weekend Activities', 'Weekday Activities', 'Markets', 'Playgrounds', 'Indoor Activities', 'Playgroups'].map(category => {
              const count = categoryBreakdown[category] || 0;
              const percentage = Math.round((count / totalActiveEventsCount) * 100);
              
              // Define custom retro colors for progress bars
              const barColors = {
                'School Holidays': 'var(--primary)',
                'Weekend Activities': 'var(--secondary)',
                'Weekday Activities': 'var(--teal)',
                'Markets': 'var(--yellow)',
                'Playgrounds': 'var(--secondary-soft)',
                'Indoor Activities': 'var(--primary-soft)',
                'Playgroups': 'var(--teal-soft)'
              };

              return (
                <div key={category} className="analytics-category-item">
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
        /* Custom responsive classes for AdminAnalytics */
        .analytics-page-container {
          padding: 48px 24px;
          max-width: 1280px;
          margin: 0 auto;
          background-color: var(--bg-cream);
          min-height: 100vh;
        }

        .analytics-page-title {
          font-family: var(--font-display);
          font-weight: 950;
          font-size: 2.5rem;
          color: var(--primary);
          margin: 0;
        }

        .analytics-overview-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 24px;
          margin-bottom: 48px;
        }

        .analytics-overview-card {
          background-color: var(--bg-white);
          padding: 24px;
          border-radius: 24px;
          border: 3.5px solid var(--text-dark);
          box-shadow: 6px 6px 0px 0px var(--text-dark);
          display: flex;
          align-items: center;
          gap: 20px;
          text-align: left;
        }

        .analytics-card-icon-container {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          border: 2.5px solid var(--text-dark);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .analytics-card-value {
          font-size: 2rem;
          font-weight: 900;
          margin: 0;
          color: var(--text-dark);
          line-height: 1.1;
        }

        .analytics-card-label {
          margin: 2px 0 0 0;
          text-transform: uppercase;
          font-size: 0.72rem;
          font-weight: 900;
          color: var(--text-muted);
          letter-spacing: 0.05em;
        }

        .analytics-section-card {
          background-color: var(--bg-white);
          border: 3.5px solid var(--text-dark);
          border-radius: 24px;
          padding: 36px;
          box-shadow: 6px 6px 0px 0px var(--text-dark);
          margin-bottom: 48px;
          text-align: left;
        }

        .analytics-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 32px;
        }

        .analytics-section-title {
          font-family: var(--font-display);
          font-weight: 900;
          font-size: 1.6rem;
          color: var(--primary);
          margin: 0;
        }

        .analytics-section-subtitle {
          color: var(--text-muted);
          font-size: 0.88rem;
          font-weight: 600;
          margin-top: 4px;
        }

        .analytics-leaderboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 32px;
          margin-bottom: 48px;
          text-align: left;
        }

        .analytics-leaderboard-item {
          padding: 20px;
          border-radius: 16px;
          border: 2.5px solid var(--text-dark);
          display: flex;
          gap: 16px;
          align-items: center;
        }

        .analytics-leaderboard-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          border: 2px solid var(--text-dark);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .analytics-leaderboard-title {
          font-weight: 800;
          font-size: 1.05rem;
          color: var(--text-dark);
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .analytics-leaderboard-desc {
          margin: 4px 0 0 0;
          text-transform: uppercase;
          font-size: 0.65rem;
          font-weight: 800;
          opacity: 0.7;
        }

        .analytics-leaderboard-clicks {
          font-size: 1.25rem;
          font-weight: 950;
          color: var(--text-dark);
          white-space: nowrap;
        }

        .analytics-category-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 24px;
        }

        .analytics-category-item {
          padding: 16px 20px;
          border-radius: 16px;
          border: 2.5px solid var(--text-dark);
          background-color: var(--bg-cream);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .svg-bar:hover {
          fill: var(--yellow) !important;
          transform: scaleY(1.05);
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Mobile specific overrides */
        @media (max-width: 1024px) {
          .analytics-leaderboard-grid {
            grid-template-columns: 1fr;
            gap: 24px;
          }
        }

        @media (max-width: 768px) {
          .analytics-page-container {
            padding: 20px 12px;
          }

          .analytics-page-title {
            font-size: 1.8rem;
          }

          .analytics-overview-grid {
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 32px;
          }

          .analytics-overview-card {
            padding: 16px 12px;
            gap: 12px;
            border-radius: 16px;
            border-width: 2.5px;
            box-shadow: 4px 4px 0px 0px var(--text-dark);
          }

          .analytics-card-icon-container {
            width: 44px;
            height: 44px;
            border-radius: 12px;
            border-width: 2px;
          }

          .analytics-card-icon-container svg {
            width: 20px;
            height: 20px;
          }

          .analytics-card-value {
            font-size: 1.5rem;
          }

          .analytics-card-label {
            font-size: 0.62rem;
          }

          .analytics-section-card {
            padding: 20px 16px;
            border-radius: 16px;
            border-width: 2.5px;
            box-shadow: 4px 4px 0px 0px var(--text-dark);
            margin-bottom: 32px;
          }

          .analytics-section-header {
            margin-bottom: 16px;
          }

          .analytics-section-title {
            font-size: 1.3rem;
          }

          .analytics-section-subtitle {
            font-size: 0.78rem;
          }

          .analytics-leaderboard-grid {
            gap: 20px;
            margin-bottom: 32px;
          }

          .analytics-leaderboard-item {
            padding: 14px;
            gap: 12px;
            border-radius: 12px;
          }

          .analytics-leaderboard-icon {
            width: 40px;
            height: 40px;
            border-radius: 10px;
          }

          .analytics-leaderboard-icon svg {
            width: 18px;
            height: 18px;
          }

          .analytics-leaderboard-title {
            font-size: 0.95rem;
          }

          .analytics-leaderboard-desc {
            font-size: 0.58rem;
          }

          .analytics-leaderboard-clicks {
            font-size: 1.05rem;
          }

          .analytics-category-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .analytics-category-item {
            padding: 12px 16px;
            border-radius: 12px;
            gap: 8px;
          }
        }

        @media (max-width: 400px) {
          .analytics-leaderboard-title {
            font-size: 0.85rem;
          }

          .analytics-leaderboard-clicks {
            font-size: 0.95rem;
          }
        }
      `}</style>
      
    </div>
  );
}
