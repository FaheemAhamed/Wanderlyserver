const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const tripRoutes = require("./routes/trip.routes");
const {
  errorHandler,
  notFound,
} = require("./middleware/error.middleware");

const app = express();

/*
 Global Middlewares
*/

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

app.use(morgan("dev"));

const authRoutes = require("./routes/auth.routes");
const reviewRoutes = require("./routes/review.routes");
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/trips", tripRoutes);
app.use("/api/v1/reviews", reviewRoutes);

/*
Health Check Route
*/

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "AI Travel Planner API is running successfully",
  });
});
app.use(notFound);

app.use(errorHandler);

module.exports = app;