const mongoose = require("mongoose");

// Activity Schema
const activitySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    estimatedCostUSD: {
      type: Number,
      default: 0,
    },
    timeOfDay: {
      type: String,
      default: "Afternoon",
    },
    coordinates: {
      lat: { type: Number, default: 0 },
      lng: { type: Number, default: 0 },
    },
    transitToNext: {
      mode: {
        type: String,
        default: "None",
      },
      durationMin: {
        type: Number,
        default: 0,
      },
    },
  }
);

// Day Plan Schema
const dayPlanSchema = new mongoose.Schema(
  {
    dayNumber: {
      type: Number,
      required: true,
    },
    activities: [activitySchema],
  },
  {
    _id: false,
  }
);

// Budget Schema
const budgetSchema = new mongoose.Schema(
  {
    flights: { type: Number, default: 0 },
    accommodation: { type: Number, default: 0 },
    food: { type: Number, default: 0 },
    activities: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  {
    _id: false,
  }
);

// Hotel Schema
const hotelSchema = new mongoose.Schema(
  {
    name: String,
    priceRange: String,
    rating: Number,
    contactNumber: String,
    image: String,
  },
  {
    _id: false,
  }
);

// Weather Info Schema
const weatherSchema = new mongoose.Schema(
  {
    temperature: Number,
    weather: String,
    description: String,
  },
  {
    _id: false,
  }
);

// Packing Item Schema
const packingItemSchema = new mongoose.Schema(
  {
    item: { type: String, required: true },
    category: {
      type: String,
      default: "Other",
    },
    checked: {
      type: Boolean,
      default: false,
    },
  }
);

// Main Trip Schema
const tripSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    destination: {
      type: String,
      required: true,
      trim: true,
    },
    cover: {
      type: String,
      default: "",
    },
    country: {
      type: String,
      default: "",
    },
    currencyCode: {
      type: String,
      default: "USD",
    },
    currencySymbol: {
      type: String,
      default: "$",
    },
    usdToINRRate: {
      type: Number,
      default: 83.5,
    },
    usdToLocalRate: {
      type: Number,
      default: 1,
    },
    numberOfDays: {
      type: Number,
      required: true,
    },
    budgetType: {
      type: String,
      enum: ["Low", "Medium", "High"],
      required: true,
    },
    interests: [
      {
        type: String,
      },
    ],
    weatherInfo: weatherSchema,
    itinerary: [dayPlanSchema],
    estimatedBudget: budgetSchema,
    hotels: [hotelSchema],
    packingList: [packingItemSchema],
    interestHighlights: [
      {
        interest: String,
        title: String,
        description: String,
        image: String,
      }
    ],
    touristRules: [
      {
        type: String,
      },
    ],
    safetyTips: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Trip = mongoose.model("Trip", tripSchema);

module.exports = Trip;