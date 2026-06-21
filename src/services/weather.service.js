const axios = require("axios");

// Fetch Destination Weather
const getDestinationWeather = async (destination) => {
  try {
    if (!process.env.WEATHER_API_KEY) {
      console.warn("WEATHER_API_KEY is not defined in env. Falling back to mock weather.");
      return {
        temperature: 22,
        weather: "Clear",
        description: "clear sky (mock data)",
      };
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
      destination
    )}&appid=${process.env.WEATHER_API_KEY}&units=metric`;

    const response = await axios.get(url);

    return {
      temperature: response.data.main.temp,
      weather: response.data.weather[0].main,
      description: response.data.weather[0].description,
    };
  } catch (error) {
    console.error(
      "Weather Service Error:",
      error.response?.data?.message || error.message
    );

    if (error.response?.status === 404) {
      throw new Error("Invalid destination. Please enter a real city or location.");
    }

    // Returning fallback weather instead of crashing the whole generation pipeline for non-404 errors
    return {
      temperature: 20,
      weather: "Clouds",
      description: "few clouds (mock fallback)",
    };
  }
};

module.exports = {
  getDestinationWeather,
};