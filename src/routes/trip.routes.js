const express = require("express");
const protect = require("../middleware/auth.middleware");
const {
  createTrip,
  getMyTrips,
  getSingleTrip,
  addActivity,
  removeActivity,
  regenerateDay,
  deleteTrip,
  togglePackingItem,
} = require("../controllers/trip.controller");

const router = express.Router();

// Trip Routes
router.post("/", protect, createTrip);
router.get("/", protect, getMyTrips);
router.get("/:tripId", protect, getSingleTrip);
router.delete("/:tripId", protect, deleteTrip);

// Editable Itinerary Routes
router.patch("/:tripId/day/:dayNumber/add-activity", protect, addActivity);
router.patch("/:tripId/day/:dayNumber/remove-activity", protect, removeActivity);
router.patch("/:tripId/day/:dayNumber/regenerate", protect, regenerateDay);

// Packing Checklist Route
router.patch("/:tripId/packing/:itemId/toggle", protect, togglePackingItem);

module.exports = router;