const axios = require("axios");
const cloudinary = require("cloudinary").v2;

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1600&q=80",
  "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=1600&q=80",
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1600&q=80",
  "https://images.unsplash.com/photo-1493558103817-58b2924bce98?w=1600&q=80",
  "https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=1600&q=80"
];

// Helper to upload to Cloudinary
const uploadToCloudinary = async (imageUrl) => {
  try {
    // To bypass Wikipedia's blocking of Cloudinary's direct fetch, we download it first
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      headers: { 'User-Agent': 'TravelPlannerApp/1.0 (contact@travelplanner.app)' },
      timeout: 10000
    });
    
    const b64 = Buffer.from(response.data, 'binary').toString('base64');
    const mime = response.headers['content-type'] || 'image/jpeg';
    const dataURI = `data:${mime};base64,${b64}`;

    const result = await cloudinary.uploader.upload(dataURI, {
      folder: "travel_planner",
    });
    return result.secure_url;
  } catch (error) {
    console.error("Cloudinary Upload Error:", error.message);
    return imageUrl; // Fallback to raw URL if upload fails
  }
};
const fetchDestinationImage = async (destination) => {
  try {
    // Attempt 1: Wikimedia Commons
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(destination)}&gsrnamespace=6&prop=imageinfo&iiprop=url&iiurlwidth=1000&format=json&gsrlimit=5&origin=*`;
    
    const response = await axios.get(searchUrl, {
      headers: {
        "User-Agent": "TravelPlannerApp/1.0 (contact@travelplanner.app)"
      },
      timeout: 5000
    });

    const pages = response.data.query?.pages;
    if (pages) {
      for (const pageId of Object.keys(pages)) {
        const info = pages[pageId]?.imageinfo?.[0];
        const imageUrl = info?.thumburl || info?.url;
        if (imageUrl && imageUrl.startsWith("http") && imageUrl.match(/\.(jpg|jpeg|png|webp)$/i)) {
          return imageUrl;
        }
      }
    }
    
    // Attempt 2: LoremFlickr based on keywords (for hotels/specific highlights)
    const keywords = destination.replace(/[^a-zA-Z0-9]/g, ',').split(',').filter(k => k.length > 2).slice(0, 4).join(',');
    if (keywords) {
      const flickrUrl = `https://loremflickr.com/1000/600/${keywords}`;
      const flickrRes = await axios.get(flickrUrl, { timeout: 5000 });
      const finalUrl = flickrRes.request?.res?.responseUrl;
      
      if (finalUrl && !finalUrl.includes('defaultImage')) {
        return finalUrl;
      }
    }

    return getRandomFallback();
  } catch (error) {
    console.error("Image Fetch Error:", error.message);
    return getRandomFallback();
  }
};

function getRandomFallback() {
  const index = Math.floor(Math.random() * FALLBACK_IMAGES.length);
  return FALLBACK_IMAGES[index];
}

module.exports = {
  fetchDestinationImage,
  uploadToCloudinary
};
