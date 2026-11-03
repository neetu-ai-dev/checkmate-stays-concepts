/* Verified Checkmate Stays business content, taken from www.checkmatestays.com
   (home, /rooms, /experience, /mussoorie-diary) on 30 Oct 2026. Concepts may shorten or
   re-order this copy but must not add amenities, prices, ratings or reviews. */

export const SITE = {
  name: "Checkmate Stays",
  shortName: "Checkmate",
  tagline: "Your key to redefined luxury",
  kind: "Boutique homestay in Mussoorie",
  liveSite: "https://www.checkmatestays.com/",
  address: "Herne Lodge Estate, Happy Valley, Charleville, Mussoorie – 248179",
  phones: ["+91 8171369222", "+91 8171979321"],
  diaryPhone: "+91 9084380321",
  email: "checkmatestays@gmail.com",
  instagram: "https://www.instagram.com/checkmate_stays/",
  instagramHandle: "@checkmate_stays",
  facebook: "https://www.facebook.com/people/Checkmate-Stays/61558496384007/",
  directions: [
    { from: "Jolly Grant Airport, Dehradun", time: "2 hrs", distance: "62 km" },
    { from: "Indira Gandhi International Airport, New Delhi", time: "6 hrs", distance: "315 km" },
  ],
  policies: {
    privacy: "https://www.checkmatestays.com/privacypolicy",
    refund: "https://www.checkmatestays.com/refund-cancellationpolicy",
  },
} as const;

export const INTRO = {
  lead:
    "Nestled in the serene landscape of Charleville, Mussoorie, Checkmate is more than just a stay — it’s an experience designed to bring you peace, comfort, and a sense of belonging.",
  oak:
    "From the majestic oak tree that stands at the heart of our garden to the breathtaking views of the snow-capped Himalayas, every detail has been thoughtfully curated to offer an escape where time slows down and life feels lighter.",
  pauseTitle: "A space to pause, reflect & reconnect",
  pause:
    "Step away from the noise, embrace stillness, and rediscover what it means to truly rest — a warm cup of tea on a sunlit terrace, a mindful stroll through lush greenery, or heartfelt conversations by the fire.",
  retreat:
    "Whether you’re seeking a weekend getaway, a creative retreat, or a long, restful escape, Checkmate welcomes you to experience hospitality that feels like home.",
};

export type Suite = {
  id: string;
  name: string;
  short: string;
  description: string;
  highlights: string[];
};

export const SUITES: Suite[] = [
  {
    id: "mountain-view",
    name: "Mountain View Suite",
    short: "Snow-clad Himalayas from your bedroom, and the Mussoorie Winterline with your morning coffee.",
    description:
      "Stunning views of the snow-clad Himalayas, right from the comfort of your bedroom. A modern kitchen with a stylish breakfast bar flows into the living area, which overlooks the garden shaded by a majestic 200-year-old oak tree.",
    highlights: ["Private balcony", "Breakfast bar & modern kitchen", "Overlooks the 200-year-old oak"],
  },
  {
    id: "landour-view",
    name: "Landour View Suite",
    short: "An infinity mountain-edge view, a sunrise bedroom and a sunset bedroom.",
    description:
      "An enchanting infinity mountain-edge view of the snow-clad Himalayas from a spacious living room. One bedroom greets the morning sun rising from behind the peaks; the other looks toward George Everest Peak, where the sun sets each evening.",
    highlights: ["Private balcony", "Chic bar counter & cosy kitchen", "View of George Everest Peak"],
  },
];

/** Shared by both suites (from /rooms). */
export const SUITE_FEATURES = [
  { title: "Two bedrooms", text: "Each suite has two well-appointed bedrooms, with separate living and sleeping areas." },
  { title: "Private L-shaped balcony", text: "A 5-metre-wide balcony wraps the suite with panoramic 360° views of mountains and valleys." },
  { title: "Living room with a view", text: "Expansive valley views, comfortable seating and modern décor." },
  { title: "Fully furnished kitchen", text: "Modern appliances and ample counter space — ideal for vegetarian and Jain diets." },
  { title: "A roof shaped like the range", text: "The curved roof flows like an inverted image of the mountains seen from the balcony." },
  { title: "Central heating & cooling", text: "Warm through the coldest winter evenings." },
];

export type Experience = { id: string; title: string; text: string; kind: "on-site" | "nearby" | "dining" };

export const EXPERIENCES: Experience[] = [
  { id: "stargazing", kind: "on-site", title: "Stargazing", text: "Clear skies over Dalai Hills, especially October to February. Look for Orion, Canis Major and Taurus, with Venus and Mars in the early evening." },
  { id: "bonfire", kind: "on-site", title: "Bonfire & barbecue", text: "A cosy bonfire in the garden, paired with grilled delicacies under a starlit sky." },
  { id: "board-games", kind: "on-site", title: "Board games on request", text: "Dobble, Jenga and more, brought to your living room for evenings with friends and family." },
  { id: "diary", kind: "dining", title: "The Mussoorie Diary", text: "A reservation-only boutique café serving Garhwali and Indian cuisine from locally sourced ingredients." },
  { id: "dalai-hills", kind: "nearby", title: "Hike to Dalai Hills", text: "A scenic trail through pine forest with panoramic views of the Garhwal ranges." },
  { id: "landour", kind: "nearby", title: "Day trip to Landour", text: "British-era charm, scenic walks and cosy cafés, a short drive away." },
  { id: "temple", kind: "nearby", title: "Shedup Choephelling Temple", text: "A tranquil Buddhist temple adorned with vibrant murals." },
  { id: "mall-road", kind: "nearby", title: "Mall Road", text: "Shops, eateries and colonial-era architecture." },
  { id: "company-garden", kind: "nearby", title: "Company Garden", text: "Vibrant flora, an artificial waterfall and space for picnics — about 3 km from Mall Road." },
  { id: "waterfalls", kind: "nearby", title: "Secret waterfalls & pine forests", text: "Personalised outings to waterfalls and pine forests around Mussoorie." },
];

export const DIARY = {
  title: "The Mussoorie Diary",
  subtitle: "A culinary journey into Garhwali and Indian heritage",
  text: "A boutique café at Checkmate that blends elegant design with authentic Garhwali and Indian cuisine — locally sourced, reservation-only.",
  reservation: "Reservation only via phone call",
  dishes: [
    { name: "Aloo Gutke", text: "Mountain-grown potatoes in mustard oil with roasted spices and whole red chillies." },
    { name: "Dal Makhani", text: "Whole black lentils slow-cooked overnight with butter and cream." },
    { name: "Momo", text: "Soft Himalayan dumplings, steamed and served with a tangy, spicy chutney." },
  ],
};

export const SUSTAINABILITY = [
  { title: "Eco-friendly products", text: "Bamboo toothbrushes, combs and razors." },
  { title: "Local cow-dung paint", text: "Used throughout the apartments; promoted by Khadi India." },
  { title: "Low-carbon materials", text: "Fibre cement boards reduce emissions and dependence on concrete." },
  { title: "Paper-light operations", text: "Check-ins, check-outs and operations are managed online." },
  { title: "Hansgrohe fittings", text: "A higher air-to-water ratio for guilt-free long showers." },
  { title: "Kimirica Earth Collection", text: "Vegan, cruelty-free bath and body products." },
];

/** Guest words exactly as published on the live homepage. */
export const GUEST_WORDS = [
  { quote: "Checkmate is pure perfection! The stunning room, exceptional dining, and incredible service made my stay unforgettable. I felt like royalty from start to finish. Can't wait to return", name: "Priya S." },
  { quote: "Absolute luxury and elegance at Checkmate! Impeccable service, amazing food, and a breathtaking views. This homestay is a true gem. Highly recommend it", name: "Rajesh K." },
  { quote: "Unforgettable experience at Checkmate! Beautiful suite, stunning Views, and personalized service. The concierge's local tours made my stay extra special. My new favorite hotel", name: "Ananya M." },
];

export const NAV = [
  { label: "Suites", href: "#suites" },
  { label: "Experiences", href: "#experiences" },
  { label: "Mussoorie Diary", href: "#diary" },
  { label: "Connect", href: "#connect" },
];
