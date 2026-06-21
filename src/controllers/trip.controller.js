const Trip = require("../models/trip.model");
const {
  getDestinationWeather,
} = require("../services/weather.service");
const {
  generateTravelPlan, regenerateDayPlan,
} = require("../services/ai.service");
const {
  fetchDestinationImage,
  uploadToCloudinary
} = require("../services/image.service");

//Create Trip

const createTrip = async (req, res) => {
  try {
    const {
      destination,
      numberOfDays,
      budgetType,
      interests,
    } = req.body;

    //Validation

    if (
      !destination ||
      !numberOfDays ||
      !budgetType
    ) {
      return res.status(400).json({
        success: false,
        message: "Required fields are missing",
      });
    }

    //Create Trip

    /*
|--------------------------------------------------------------------------
| Generate AI Travel Plan
|--------------------------------------------------------------------------
*/
    //Fetch Weather and Cover Image in parallel for performance optimization
    console.time(`Parallel fetching for ${destination}`);
    const [weatherInfo, rawCoverUrl] = await Promise.all([
      getDestinationWeather(destination),
      fetchDestinationImage(destination)
    ]);
    console.timeEnd(`Parallel fetching for ${destination}`);

    const aiResponse = await generateTravelPlan({
      destination,
      numberOfDays,
      budgetType,
      interests,
    });

    /*
    |--------------------------------------------------------------------------
    | Upload Images to Cloudinary
    |--------------------------------------------------------------------------
    */
    console.time(`Cloudinary uploads for ${destination}`);
    
    // Upload main cover
    const coverPromise = uploadToCloudinary(rawCoverUrl);

    // Fetch and upload interest highlights
    let interestHighlights = aiResponse.interestHighlights || [];
    const interestPromises = interestHighlights.map(async (highlight) => {
      const rawHighlightImageUrl = await fetchDestinationImage(`${highlight.title} ${destination}`);
      const uploadedHighlightImage = await uploadToCloudinary(rawHighlightImageUrl);
      return {
        ...highlight,
        image: uploadedHighlightImage
      };
    });

    // Fetch and upload hotel images
    let hotels = aiResponse.hotels || [];
    const hotelPromises = hotels.map(async (hotel) => {
      const rawHotelImageUrl = await fetchDestinationImage(`${hotel.name} ${destination}`);
      const uploadedHotelImage = await uploadToCloudinary(rawHotelImageUrl);
      return {
        ...hotel,
        image: uploadedHotelImage
      };
    });

    const [cover, resolvedHighlights, resolvedHotels] = await Promise.all([
      coverPromise,
      Promise.all(interestPromises),
      Promise.all(hotelPromises)
    ]);
    console.timeEnd(`Cloudinary uploads for ${destination}`);

    /*
    |--------------------------------------------------------------------------
    | Create Trip With AI Data
    |--------------------------------------------------------------------------
    */

    const trip = await Trip.create({
      user: req.user.userId,

      destination,
      cover,
      country: aiResponse.country || "",
      currencyCode: aiResponse.currencyCode || "USD",
      currencySymbol: aiResponse.currencySymbol || "$",
      usdToINRRate: Number(aiResponse.usdToINRRate) || 83.5,
      usdToLocalRate: Number(aiResponse.usdToLocalRate) || 1,

      numberOfDays,

      budgetType,

      interests,

      interestHighlights: resolvedHighlights,

      weatherInfo,

      itinerary: aiResponse.itinerary,

      estimatedBudget:
        aiResponse.estimatedBudget,

      hotels: resolvedHotels,

      packingList:
        aiResponse.packingList,

      touristRules:
        aiResponse.touristRules || [],

      safetyTips:
        aiResponse.safetyTips,
    });

    return res.status(201).json({
      success: true,
      message: "Trip created successfully",
      trip,
    });
  } catch (error) {
    console.error("❌ CREATE TRIP CONTROLLER ERROR:", error);

    if (error.message && error.message.includes("Invalid destination")) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: `Internal server error: ${error.message}`,
      error: error.stack
    });
  }
};


// Get Logged-in User Trips

const getMyTrips = async (req, res) => {
  try {
    // Find User Trips Only

    const trips = await Trip.find({
      user: req.user.userId,
    })
    .select("destination cover country numberOfDays budgetType interests createdAt")
    .sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: trips.length,
      trips,
    });
  } catch (error) {
    console.error("Get Trips Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get Single Trip

const getSingleTrip = async (
  req,
  res
) => {
  try {
    const { tripId } = req.params;

    const trip = await Trip.findOne({
      _id: tripId,
      user: req.user.userId,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    return res.status(200).json({
      success: true,
      trip,
    });
  } catch (error) {
    console.error(
      "Get Single Trip Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


// Add Activity To Day

const addActivity = async (req, res) => {
  try {
    const { tripId, dayNumber } = req.params;
    const { activity } = req.body;

    // Validation
    if (!activity || !activity.title) {
      return res.status(400).json({
        success: false,
        message: "Activity title is required",
      });
    }

    // Find Trip
    const trip = await Trip.findOne({
      _id: tripId,
      user: req.user.userId,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    // Find Day (or create day if it doesn't exist, though it should exist)
    let dayPlan = trip.itinerary.find(
      (day) => day.dayNumber === Number(dayNumber)
    );

    if (!dayPlan) {
      // support matching either dayNumber or day
      dayPlan = trip.itinerary.find(
        (day) => day.day === Number(dayNumber)
      );
    }

    if (!dayPlan) {
      return res.status(404).json({
        success: false,
        message: "Day not found",
      });
    }

    // Add Activity
    const newActivity = {
      title: activity.title,
      description: activity.description || "",
      estimatedCostUSD: Number(activity.estimatedCostUSD) || 0,
      timeOfDay: activity.timeOfDay || "Afternoon",
      coordinates: activity.coordinates || { lat: 0, lng: 0 },
      transitToNext: activity.transitToNext || { mode: "None", durationMin: 0 }
    };

    dayPlan.activities.push(newActivity);
    await trip.save();

    return res.status(200).json({
      success: true,
      message: "Activity added successfully",
      itinerary: trip.itinerary,
      trip,
    });
  } catch (error) {
    console.error("Add Activity Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


// Remove Activity

const removeActivity = async (req, res) => {
  try {
    const { tripId, dayNumber } = req.params;
    const { activityId } = req.body;

    if (!activityId) {
      return res.status(400).json({
        success: false,
        message: "Activity ID is required",
      });
    }

    // Find Trip
    const trip = await Trip.findOne({
      _id: tripId,
      user: req.user.userId,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    //Find Day
    let dayPlan = trip.itinerary.find(
      (day) => day.dayNumber === Number(dayNumber)
    );

    if (!dayPlan) {
      dayPlan = trip.itinerary.find(
        (day) => day.day === Number(dayNumber)
      );
    }

    if (!dayPlan) {
      return res.status(404).json({
        success: false,
        message: "Day not found",
      });
    }

    // Remove Activity by ID
    dayPlan.activities = dayPlan.activities.filter(
      (item) => item._id && item._id.toString() !== activityId
    );

    await trip.save();

    return res.status(200).json({
      success: true,
      message: "Activity removed successfully",
      itinerary: trip.itinerary,
      trip,
    });
  } catch (error) {
    console.error("Remove Activity Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Toggle Packing Item Checked State

const togglePackingItem = async (req, res) => {
  try {
    const { tripId, itemId } = req.params;

    const trip = await Trip.findOne({
      _id: tripId,
      user: req.user.userId,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    const item = trip.packingList.id(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Packing item not found",
      });
    }

    item.checked = !item.checked;
    await trip.save();

    return res.status(200).json({
      success: true,
      message: "Packing item toggled successfully",
      packingList: trip.packingList,
      trip,
    });
  } catch (error) {
    console.error("Toggle Packing Item Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Regenerate Specific Day

const regenerateDay = async (req, res) => {
  try {
    const { tripId, dayNumber } = req.params;
    const { prompt: userPrompt } = req.body;

    // Find Trip

    const trip = await Trip.findOne({
      _id: tripId,
      user: req.user.userId,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    // Generate New Day Plan

    const regeneratedDay =
      await regenerateDayPlan({
        destination: trip.destination,
        dayNumber,
        interests: trip.interests,
        budgetType: trip.budgetType,
        userPrompt,
      });


    // Replace Existing Day


    trip.itinerary = trip.itinerary.map((day) => {
      const currentDayNum = day.dayNumber !== undefined ? day.dayNumber : day.day;
      return currentDayNum === Number(dayNumber) ? regeneratedDay : day;
    });

    await trip.save();

    return res.status(200).json({
      success: true,
      message:
        "Day regenerated successfully",
      itinerary: trip.itinerary,
    });
  } catch (error) {
    console.error(
      "Regenerate Day Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Delete Trip

const deleteTrip = async (
  req,
  res
) => {
  try {
    const { tripId } =
      req.params;

    const trip =
      await Trip.findOneAndDelete({
        _id: tripId,
        user: req.user.userId,
      });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message:
          "Trip not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Trip deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete Trip Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Internal server error",
    });
  }
};


module.exports = {
  createTrip,
  getMyTrips,
  getSingleTrip,
  addActivity,
  removeActivity,
  regenerateDay,
  deleteTrip,
  togglePackingItem,
};

