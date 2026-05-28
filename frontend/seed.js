import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCZOi7XNMpmzHLq4kUaFZoMFRHSChwUnUg",
  authDomain: "littlelocals-cc-55.firebaseapp.com",
  projectId: "littlelocals-cc-55",
  storageBucket: "littlelocals-cc-55.firebasestorage.app",
  messagingSenderId: "725277562751",
  appId: "1:725277562751:web:c4cf82acdbe6b704776c4a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const seedEvents = [
  {
    title: "Speers Point Variety Playground Day Out",
    category: "Playground",
    location: "Speers Point Park, Park Rd, Speers Point NSW 2284",
    date: "2026-06-03",
    time: "09:00 AM - 05:00 PM",
    age_group: "All Ages",
    description: "Speers Point Park is one of the absolute best playgrounds in NSW! Fully fenced, featuring a massive double-storey slide, flying foxes, swings, sensory play areas, water play, and a great cafe right next door. Totally free to enter! Parking is plentiful, but it gets busy on weekends. Perfect for a centralised family meet-up.",
    image_url: "https://images.unsplash.com/photo-1596464716127-f2a82984de30?auto=format&fit=crop&w=800&q=80",
    price: "FREE",
    link: "https://www.lakemac.com.au/Facilities/Parks-playgrounds-and-reserves/Speers-Point-Park"
  },
  {
    title: "Terrigal Beach Storytime & Sandplay",
    category: "Music & Storytime",
    location: "Terrigal Beach Foreshore, Terrigal NSW 2260",
    date: "2026-06-05",
    time: "10:00 AM - 11:00 AM",
    age_group: "0-5 years",
    description: "Join local mums and dads at the Terrigal beach foreshore for a free, informal storytime, nursery rhymes, and bubbles under the shady trees. Bring a towel or a rug and some beach buckets to play in the sand afterwards. Shaded area near the war memorial. Great opportunity to connect with local parents.",
    image_url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80",
    price: "FREE",
    link: "https://littlelocals.au"
  },
  {
    title: "Gosford Library Toddler Storytime",
    category: "Library",
    location: "Gosford Library, 122a Erina St, Gosford NSW 2250",
    date: "2026-06-09",
    time: "10:30 AM - 11:15 AM",
    age_group: "0-5 years",
    description: "Free weekly storytime session for toddlers, featuring interactive songs, book readings, and a small craft activity to take home. Bookings are not required, just turn up and join the fun! Great way to introduce kids to the library environment. Clean toilets and baby change facilities on site.",
    image_url: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80",
    price: "FREE",
    link: "https://www.centralcoast.nsw.gov.au/libraries"
  },
  {
    title: "Avoca Beach Rockpool Exploring",
    category: "Outdoors",
    location: "Avoca Beach Rockpools, Avoca Beach NSW 2251",
    date: "2026-06-14",
    time: "02:00 PM - 03:30 PM",
    age_group: "6-12 years",
    description: "Grab your water shoes and come explore the incredible rockpools on the southern end of Avoca Beach. Search for tiny crabs, starfishes, sea anemones, and colourful shells in the shallow crystal-clear pools. Ensure children are supervised. Totally free and natural outdoor education!",
    image_url: "https://images.unsplash.com/photo-1502082553048-f2a82984de30?auto=format&fit=crop&w=800&q=80",
    price: "FREE",
    link: "https://littlelocals.au"
  }
];

const seedSuggestions = [
  {
    title: "Woy Woy Waterfront Play Day",
    category: "Playground",
    location: "Woy Woy Lions Park, Brick Wharf Rd, Woy Woy NSW 2256",
    date: "2026-06-20",
    time: "10:00 AM - 01:00 PM",
    age_group: "All Ages",
    description: "Scraped Facebook Lead: Free community playgroup meeting up at Woy Woy Lions Park. There will be outdoor activities, parent chats, and kids can enjoy the fully fenced playground equipment and pirate ship! Cafe across the road.",
    image_url: "https://images.unsplash.com/photo-1596464716127-f2a82984de30?auto=format&fit=crop&w=800&q=80",
    link: "https://www.facebook.com/events/123456789/"
  },
  {
    title: "School Holiday Recycle Craft",
    category: "Art & Craft",
    location: "Erina Library, Erina Fair, Erina NSW 2250",
    date: "2026-06-25",
    time: "11:00 AM - 12:30 PM",
    age_group: "6-12 years",
    description: "Scraped Facebook Lead: Free eco-craft session for school-aged kids (6-12 yrs) using recycled items to build robotic sculptures. Parental supervision is required. Limited space, first-in-best-dressed. Great rainy day activity inside Erina Fair.",
    image_url: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=800&q=80",
    link: "https://www.facebook.com/events/987654321/"
  }
];

async function seed() {
  console.log("Seeding database...");
  try {
    for (const e of seedEvents) {
      const docRef = await addDoc(collection(db, "events"), e);
      console.log("Seeded live event: ", docRef.id);
    }
    for (const s of seedSuggestions) {
      const docRef = await addDoc(collection(db, "suggestions"), s);
      console.log("Seeded scraper suggestion: ", docRef.id);
    }
    console.log("Database seeded successfully! 🎉");
  } catch (error) {
    console.error("Seeding error:", error);
  }
}

seed();
