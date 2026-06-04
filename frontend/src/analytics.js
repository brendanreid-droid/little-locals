import { doc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from './firebase';

// Helper to get local date string in YYYY-MM-DD format
export function getLocalDateString() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Track unique daily visits
export async function trackVisit() {
  try {
    const todayStr = getLocalDateString();
    const storedDate = localStorage.getItem('ll_last_visit_date');

    // Only count unique daily visits per browser session/device
    if (storedDate !== todayStr) {
      const docRef = doc(db, 'analytics_visits', todayStr);
      await setDoc(docRef, { visits: increment(1) }, { merge: true });
      localStorage.setItem('ll_last_visit_date', todayStr);
    }
  } catch (error) {
    console.error("Error tracking visit:", error);
  }
}

// Track clicks on event listings
export async function trackEventClick(eventId) {
  if (!eventId) return;
  try {
    // 1. Increment all-time clicks
    const docRef = doc(db, 'events', eventId);
    await updateDoc(docRef, { clicks: increment(1) });

    // 2. Increment monthly clicks
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const monthStr = `${yyyy}-${mm}`;
    const monthlyDocId = `${monthStr}_${eventId}`;
    
    const monthlyDocRef = doc(db, 'analytics_monthly_clicks', monthlyDocId);
    await setDoc(monthlyDocRef, {
      clicks: increment(1),
      itemId: eventId,
      itemType: 'event',
      month: monthStr
    }, { merge: true });
  } catch (error) {
    console.warn("Could not track event click (it might be a draft or suggestion):", error);
  }
}

// Track clicks on blog posts
export async function trackPostClick(postId) {
  if (!postId) return;
  try {
    // 1. Increment all-time clicks
    const docRef = doc(db, 'posts', postId);
    await updateDoc(docRef, { clicks: increment(1) });

    // 2. Increment monthly clicks
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const monthStr = `${yyyy}-${mm}`;
    const monthlyDocId = `${monthStr}_${postId}`;

    const monthlyDocRef = doc(db, 'analytics_monthly_clicks', monthlyDocId);
    await setDoc(monthlyDocRef, {
      clicks: increment(1),
      itemId: postId,
      itemType: 'post',
      month: monthStr
    }, { merge: true });
  } catch (error) {
    console.warn("Could not track post click:", error);
  }
}

