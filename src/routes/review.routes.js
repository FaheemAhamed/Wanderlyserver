const express = require("express");
const protect = require("../middleware/auth.middleware");
const { createReview, getAllReviews } = require("../controllers/review.controller");

const router = express.Router();

// Reviews routes
router.post("/", protect, createReview);
router.get("/", getAllReviews);

module.exports = router;
