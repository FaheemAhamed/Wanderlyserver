const { GoogleGenerativeAI } = require("@google/generative-ai");
const { getDestinationWeather } = require("./weather.service");
const { withExponentialBackoff } = require("../utils/retry.util");

// Gemini Configuration
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Gemini Model
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: {
    responseMimeType: "application/json",
  }
});

// Helper to clean Markdown wrappers from JSON string
function cleanJsonText(rawText) {
  let cleanText = rawText.trim();
  // Strip starting ```json or ```
  cleanText = cleanText.replace(/^```(json)?\s*/i, "");
  // Strip ending ```
  cleanText = cleanText.replace(/\s*```$/, "");
  return cleanText.trim();
}

// Generate Travel Plan
const generateTravelPlan = async ({
  destination,
  numberOfDays,
  budgetType,
  interests,
}) => {
  try {
    // FETCH DESTINATION WEATHER
    const weatherData = await getDestinationWeather(destination);

    // Prompt Engineering
    const prompt = `
You are an expert AI Travel Planner.

Generate a COMPLETE travel plan in STRICT JSON format only.

DO NOT return markdown.
DO NOT return explanation text.
DO NOT wrap response inside triple backticks.

Destination: ${destination}
Number of Days: ${numberOfDays}
Budget Type: ${budgetType}
Interests: ${interests.join(", ")} 

Current Weather:
- Temperature: ${weatherData.temperature}°C
- Weather Condition: ${weatherData.weather}
- Description: ${weatherData.description}

Generate a dynamic, curated packing checklist strictly categorized exactly under "Crucial Travel Documents", "Activity-Specific Equipment", and "Climate Wear".
- Use the current weather data provided above to curate the "Climate Wear" items.
- Use the planned itinerary activities to inform the "Activity-Specific Equipment" items.
- Provide up to 4 essential items per category.


For each day, generate detailed activities. For each activity, specify the title, description, estimated cost in USD, the time of day ('Morning', 'Afternoon', 'Evening'), simulated map coordinates (lat/lng decimal values reflecting the location of the activity), and simulated transit details to the next activity ('mode': 'Walk' | 'Transit' | 'Drive' | 'None', 'durationMin': number of minutes). Make transit modes and durations realistic between the coordinates of subsequent activities on the same day.

Generate realistic, real-world estimates for the estimatedBudget (in USD). 
Accommodation, food, activities, and transport must align with typical rates for a "${budgetType}" budget tier in ${destination} for ${numberOfDays} days.

Identify the country name where the destination is located (e.g., 'India', 'Japan', 'France'). Identify the local currency code (e.g., 'INR', 'JPY', 'EUR') and symbol (e.g., '₹', '¥', '€'). Estimate the current conversion rate from USD to INR as a number (e.g., 83.5) and the conversion rate from USD to the local currency of the destination as a number (e.g., 155.0 for JPY, 0.92 for EUR, 83.5 if local is INR).

Generate REAL, EXISTING hotels matching the destination, and include their public contact numbers (contactNumber key, e.g., '+81 3-5800-8111' or '+91 891-2789000') and real name.

For each Interest selected, provide a famous signature spot, activity, or cultural highlight in that specific destination/country. Include the 'interest' category, a specific 'title', and a brief 1-2 sentence 'description'.

Generate 3-5 specific, important tourist rules, laws, or cultural etiquettes for the destination country (e.g. "No tipping", "Cover shoulders in temples").

Return ONLY valid JSON with this exact structure:

{
  "country": "Japan",
  "currencyCode": "JPY",
  "currencySymbol": "¥",
  "usdToINRRate": 83.5,
  "usdToLocalRate": 155.4,
  "interestHighlights": [
    {
      "interest": "Food",
      "title": "Tsukiji Outer Market",
      "description": "Experience the freshest sushi and legendary street food in Tokyo's historic culinary hub."
    }
  ],
  "itinerary": [
    {
      "dayNumber": 1,
      "activities": [
        {
          "title": "Visit Senso-ji Temple",
          "description": "Explore the oldest and most iconic Buddhist temple in Tokyo.",
          "estimatedCostUSD": 0,
          "timeOfDay": "Morning",
          "coordinates": { "lat": 35.7147, "lng": 139.7967 },
          "transitToNext": { "mode": "Walk", "durationMin": 10 }
        }
      ]
    }
  ],
  "estimatedBudget": {
    "flights": 500,
    "accommodation": 300,
    "food": 150,
    "activities": 100,
    "total": 1050
  },
  "hotels": [
    {
      "name": "Hotel Sakura Tokyo",
      "priceRange": "Budget Friendly",
      "rating": 4.5,
      "contactNumber": "+81 3-5800-8111"
    }
  ],
  "packingList": [
    {
      "item": "Passport",
      "category": "Crucial Travel Documents"
    },
    {
      "item": "Light Windbreaker",
      "category": "Climate Wear"
    }
  ],
  "touristRules": [
    "Do not tip at restaurants, it is considered rude.",
    "Always stand on the left side of the escalator."
  ],
  "safetyTips": [
    "Keep a digital copy of your passport"
  ]
}
`;

    // Execute with exponential backoff
    text = await withExponentialBackoff(async () => {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    });

    // Clean and Parse JSON Response
    const cleanText = cleanJsonText(text);
    const parsedResponse = JSON.parse(cleanText);

    return parsedResponse;
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw new Error("Failed to generate AI travel plan");
  }
};

// Regenerate Specific Day Plan
const regenerateDayPlan = async ({
  destination,
  dayNumber,
  interests,
  budgetType,
  userPrompt,
}) => {
  try {
    const customInstruction = userPrompt && userPrompt.trim() !== "" 
      ? `\nCRITICAL USER INSTRUCTION: The user has specifically requested the following changes for this day: "${userPrompt.trim()}". You MUST strictly follow this request when generating the activities for this day.\n`
      : "";

    const prompt = `
You are an expert AI Travel Planner.

Regenerate ONLY Day ${dayNumber} itinerary for a trip to ${destination}.
Include 3-4 activities.
${customInstruction}
Budget Type: ${budgetType}
Interests: ${interests.join(", ")}

Return ONLY valid JSON.
DO NOT return markdown.
DO NOT wrap inside triple backticks.

Use this structure exactly:

{
  "dayNumber": ${dayNumber},
  "activities": [
    {
      "title": "Outdoor Activity Name",
      "description": "Brief details of what to see or do.",
      "estimatedCostUSD": 25,
      "timeOfDay": "Morning",
      "coordinates": { "lat": 35.7147, "lng": 139.7967 },
      "transitToNext": { "mode": "Walk", "durationMin": 15 }
    }
  ]
}
`;

    // Execute with exponential backoff
    const text = await withExponentialBackoff(async () => {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    });

    const cleanText = cleanJsonText(text);
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Regenerate Day Error:", error);
    throw new Error("Failed to regenerate itinerary day");
  }
};

module.exports = {
  generateTravelPlan,
  regenerateDayPlan,
};