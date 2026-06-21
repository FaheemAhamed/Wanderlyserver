const User = require("../models/user.model");
const Review = require("../models/review.model");

// Create User Review / Testimonial
const createReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    if (!rating || !comment) {
      return res.status(400).json({
        success: false,
        message: "Rating and comment are required",
      });
    }

    // Find user to associate their real name
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const review = await Review.create({
      user: user._id,
      userName: user.name,
      rating: Number(rating),
      comment,
    });

    return res.status(201).json({
      success: true,
      message: "Testimonial submitted successfully",
      review,
    });
  } catch (error) {
    console.error("Create Review Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get All Reviews (Publicly accessible)
const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    console.error("Get Reviews Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  createReview,
  getAllReviews,
};
