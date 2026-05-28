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

const seedPosts = [
  {
    title: "Umina Beach Playground (Peninsula Recreation Active Zone)",
    category: "Review",
    date: "2026-05-15",
    excerpt: "The ultimate family-friendly playground on the Coast! Fully fenced, beach adjacent, with climbing webs, flying foxes, and a fantastic nearby cafe.",
    content: `Umina Beach Playground (officially the Peninsula Recreation Active Zone) is easily one of the crown jewels of playgrounds on the Central Coast! Located right behind Umina Beach, this playground has everything you could possibly need for a full day of free family fun.

    🏠 FACILITIES:
    The playground is massive and fully fenced, which is an absolute lifesaver for parents with toddlers who love to run. Inside, you'll find custom climbing nets, a large pirate ship play structure, multiple swing sets, a dedicated toddler play space, and a skate park/BMX track next door for older kids.
    
    🌳 SHADE & AMENITIES:
    There are multiple large shade sails covering the main climbing sections, plus plenty of mature trees offering shade for picnic blankets. Clean public toilets and baby change facilities are located just outside the fence line.
    
    ☕ CAFE & PARKING:
    Right next to the playground is the Jasmine Greens Park Kiosk, offering great coffee, kids meals, and treats. Parking is plentiful in the main beachfront car park, though it can fill up quickly on warm sunny weekends.
    
    👶 AGE SUITABILITY:
    All ages. From babies crawling in the sand to teenagers riding on the pump tracks, it is an exceptionally designed active play space. Highly recommended!`,
    image_url: "https://images.unsplash.com/photo-1596464716127-f2a82984de30?auto=format&fit=crop&w=800&q=80",
    is_published: true
  },
  {
    title: "Erina Library Craft Hour & Fair Visit Guide",
    category: "Parenting Guide",
    date: "2026-05-20",
    excerpt: "How to make the most of the free weekly storytimes and sensory rooms at Erina Library inside Erina Fair.",
    content: `Looking for a free, air-conditioned indoor activity for a rainy or extremely hot Central Coast day? Erina Library (located inside the Erina Fair shopping complex) is an incredible community resource that is 100% free to access and enjoy!

    📖 WEEKLY STORYTIMES:
    The library hosts regular free sessions:
    - Babytime (0-12 months): Gentle nursery rhymes, bounce songs, and board books.
    - Toddler Time (1-3 years): Action songs, movement, and short stories.
    - Storytime (3-5 years): Engaging storybook readings followed by a simple, take-home craft activity.
    Sessions run weekly during school terms and no bookings are required—just walk in!
    
    🎨 EXTRA FACILITIES:
    The children's area is colourful and welcoming, featuring small reading cubbies, puzzles, and sensory wall toys. They also have a wonderful selection of parenting resources and kids audiobooks.
    
    🚗 PARENT COMFORT:
    Located inside Erina Fair means you have access to ample parking, parenting rooms, shopping, and food courts right outside. It is the perfect centralised location to get out of the house, read some books, and meet other local mums and dads.`,
    image_url: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80",
    is_published: true
  }
];

async function seed() {
  console.log("Seeding blog posts...");
  try {
    for (const p of seedPosts) {
      const docRef = await addDoc(collection(db, "posts"), p);
      console.log("Seeded blog post: ", docRef.id);
    }
    console.log("Blog posts seeded successfully! 🎉");
  } catch (error) {
    console.error("Seeding error:", error);
  }
}

seed();
