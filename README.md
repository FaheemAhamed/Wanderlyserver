# Wanderly Server - Backend API & Services

Wanderly Server is the robust, secure, and performant backend engine powering the Wanderly AI Travel Planner. It orchestrates user authentication, manages itinerary data structures, and acts as the integration hub for Google Gemini AI, OpenWeatherMap, Wikimedia Commons, and Cloudinary.

---

## 🚀 Project Overview

Wanderly Server delivers the business logic, AI orchestration, and database storage layer for the Wanderly application. It is designed to expose a clean, secure RESTful API that handles user onboarding, processes generative travel requests, coordinates asset downloads/caching, and allows granular, day-by-day modifications to generated itineraries.

### Key Capabilities
- **Orchestrated Parallel Workflows**: Fetches destination weather and imagery concurrently to reduce user waiting times.
- **AI Prompt Engineering**: Translates destination, duration, budget tier, and interests into a clean, structured JSON request to Gemini.
- **Dynamic Image Caching**: Crawls open-source libraries for landmarks and automatically uploads them to a Cloudinary CDN, bypassing hotlinking limitations and securing stable image resources.
- **Granular Customization**: Exposes endpoints to add/delete activities manually and regenerate specific days through custom text prompts.

---

## 🛠️ Chosen Tech Stack & Justifications

| Technology | Purpose | Justification |
| :--- | :--- | :--- |
| **Node.js & Express.js (v5)** | REST API Gateway | Fast, asynchronous event-driven runtime with lightweight routing capabilities suited for orchestrating external APIs. |
| **MongoDB & Mongoose (v9)** | Database & Object Modeling | Document-store database allowing seamless storage of nested, structured itinerary arrays, checklists, and hotel items without expensive relational joins. |
| **@google/generative-ai (v0.24)** | AI Engine Client | Direct integration with `gemini-2.5-flash` using `responseMimeType: "application/json"` for high-speed, structured data generation. |
| **OpenWeatherMap API** | Meteorology Context | Real-time weather API mapping current atmospheric stats to feed directly into the prompt engineering context. |
| **Cloudinary** | Asset Cache & CDN | Mitigates CORS issues, image expiration, and hotlink blockages by standardizing, sizing, and serving assets from a fast global CDN. |
| **JWT & bcryptjs** | Security & Auth | Cryptographically secures client requests statelessly while keeping user credentials salted and hashed in database storage. |

---

## 📐 High-Level Architecture Explanation

The server handles requests following an asynchronous controller-router model. When generating travel plans, the service pipeline works in structured chronological and parallel phases:

```mermaid
graph TD
    User([User Client]) -->|1. Submit Generation| NextJS[Next.js Client]
    NextJS -->|2. POST /api/v1/trips/generate| Express[Express Server]
    
    subgraph Parallel Phase 1 (Initial Context)
        Express -->|3a. Query Weather| WeatherAPI[OpenWeatherMap API]
        Express -->|3b. Query Cover Image| WikiAPI[Wikipedia Commons]
    end
    
    Express -->|4. Request structured plan with Weather| Gemini[Gemini 2.5 Flash]
    Gemini -->|5. Return structured JSON itinerary| Express
    
    subgraph Parallel Phase 2 (Asset Caching)
        Express -->|6a. Fetch Hotel Images| LoremFlickr[LoremFlickr / Wiki]
        Express -->|6b. Upload & cache assets| Cloudinary[Cloudinary CDN]
    end
    
    Express -->|7. Save enriched plan| MongoDB[(MongoDB Atlas)]
    Express -->|8. Return enriched JSON| NextJS
    NextJS -->|9. Render interactive UI & print view| User
```

1. **Routing & Session Guards**: Incoming requests are validated through `auth.middleware.js` to extract and verify the JWT token.
2. **Context Synthesis**: In the generation route, weather and location hero imagery are fetched *concurrently* using `Promise.all` to minimize request latency.
3. **Structured Generative Prompt**: Weather statistics, interests, budget tier, and duration are parsed into a specialized prompt. The Google Gemini API is locked to JSON output.
4. **Enriched Assets Caching**: The resulting itinerary contains list-items, highlights, and hotels. The server programmatically searches for specific images for each hotel and highlight, uploads them to Cloudinary in parallel, and appends the secure CDN URLs.
5. **Persistence**: The final enriched record is stored in MongoDB and returned to the client.

---

## 🔐 Authentication & Authorization Approach

Wanderly Server implements a hybrid authentication structure supporting traditional credential sets and Google OAuth:

- **JWT Stateless Security**: On successful login or registration, the server issues a JSON Web Token signed with a 256-bit secret key (`JWT_SECRET`) that expires in 7 days.
- **Google OAuth Backend Integration**: The frontend authenticates directly against Google using Firebase Client SDK. The frontend passes user profile details (`email`, `name`, `photoURL`) to the `/api/auth/google` endpoint. The server checks if the email exists, creates a record if missing with a random cryptographically secure password, and signs a backend JWT for subsequent request authorization.
- **Route Interception**: Protected routes use the `protect` middleware which verifies the JWT token from the `Authorization: Bearer <token>` header, decodes the user database reference (`userId`), and attaches it to `req.user` to scope all document queries.

---

## 🤖 AI Agent Design & Purpose

Wanderly utilizes a deterministic generative agent pattern built on top of `gemini-2.5-flash`. Rather than using a free-form conversational chat loop, the backend locks the AI into a strict data-structuring agent role.

### Prompt Engineering Design
- **System Role**: Defined as an "Expert AI Travel Planner".
- **Structured Contracts**: Provided with a complete JSON model schema template. The model is configured with `responseMimeType: "application/json"`, which forces the model to respond in valid JSON matching the exact schema definition.
- **Context Injection**: The prompt is continuously updated with real-time weather logs, specific budget instructions, destination guidelines, and user interests.
- **Sub-Agent Refinement**: To allow dynamic itinerary editing, a specialized `regenerateDayPlan` service accepts user natural language parameters (e.g., *"Make it less walking intensive"* or *"Only vegetarian food places"*). It merges this correction with original parameters to output a single, revised itinerary day, avoiding high-latency and expensive complete trip regeneration.

---

## 🎨 Creative & Custom Features

### 1. Weather-Aware Adaptive Packing Agent
Before the trip generation prompt is constructed, the backend calls OpenWeatherMap API to get the target city's temperature and conditions. The AI evaluates this context and curates a customized checklist under `Climate Wear` (e.g. packing thermal undergarments for below 10°C weather, or sunscreen/caps for hot days) and `Activity-Specific Equipment` informed by the itinerary.

### 2. High-Performance CDN Media Mirroring Pipeline
To ensure images never break, load slowly, or suffer from hotlinking blockages (a common problem when using raw Wikimedia images), the backend implements a cache pipeline:
1. Programmatically queries Wikimedia and LoremFlickr APIs.
2. Downloads the binary files temporarily using a specialized `User-Agent` header to avoid scrapers blockages.
3. Uploads the buffers directly to Cloudinary.
4. Stores the optimized Cloudinary CDN URL in the database.

---

## ⚙️ Setup & Installation (Local & Deployed)

### Prerequisites
- Node.js (v18 or higher)
- MongoDB database (Atlas cloud cluster or local instance)
- Google Gemini API Key (available on Google AI Studio)
- OpenWeatherMap API Key (free tier)
- Cloudinary Account credentials

### Local Installation
1. Navigate to the server root:
   ```bash
   cd Wanderlyserver-main
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root of the server directory:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_signature_secret_key
   GEMINI_API_KEY=your_gemini_api_studio_key
   WEATHER_API_KEY=your_openweathermap_api_key
   CLIENT_URL=http://localhost:3000
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   ```
4. Start the server in development mode (launches server via `nodemon` with hot reloading):
   ```bash
   npm run dev
   ```
5. Verify the server is running by accessing: `http://localhost:5000`

### Cloud Deployment (e.g., Render)
1. Commit the codebase (ensuring `.env` is excluded in `.gitignore`).
2. Create a new **Web Service** on Render or Heroku.
3. Set the build command to `npm install` and start command to `node server.js`.
4. In the Environment Variables settings, copy over all keys from your local `.env`. Ensure `CLIENT_URL` is set to your deployed frontend domain.
5. In your MongoDB Atlas dashboard, add the deployment server's outbound IP addresses to the network access whitelist, or select `0.0.0.0/0` (Allow access from anywhere).

---

## 📐 Key Design Decisions & Trade-Offs

- **Decision: Strict JSON MIME Type (`application/json`)**
  - *Justification*: Prevents parser crashes by forcing Gemini to output compliant JSON strings without markdown wrapper blockages.
  - *Trade-off*: Limits Gemini's conversational capabilities, which is acceptable since the UI is structured around deterministic component timelines.
- **Decision: Parallel API Fetching in Generation Pipeline**
  - *Justification*: Executing Weather searches and Cover image scraping concurrently before generating the itinerary halves the route processing latency.
  - *Trade-off*: High server resource consumption for quick bursts, which could trigger database connection pool exhaustion under heavy traffic.
- **Decision: Stateful Storage of Generated Plans**
  - *Justification*: Itineraries are stored in MongoDB immediately. Users can recall their past trips instantly, print them, and edit items without paying for additional generative API tokens.
  - *Trade-off*: Increased database size requirements, but MongoDB document structure handles this storage elegantly.

---

## ⚠️ Known Limitations

- **Simulated Coordinates & Navigation**: Latitudes and longitudes of generated activities are simulated values provided by the generative model. They represent the general area but are not checked against navigation pathfinding routers (like Google Maps Direction API) for real-world route optimization.
- **Weather Forecast Boundary**: Since OpenWeatherMap's free tier provides real-time current conditions and short forecasts, the packing generator uses current local data to plan for future trips.
- **No Direct Booking Integration**: Recommends genuine hotels with active contact phone numbers, but is not connected to a booking engine (like Expedia or Booking.com) to provide real-time availability or checkout.

---

## 📂 Project Directory Structure

```
Wanderlyserver-main/
├── server.js                 # Database connector and port binding listener
├── src/
│   ├── app.js                # Express app initialization, middleware configurations
│   ├── config/
│   │   └── database.js       # Mongoose connection and error listeners
│   ├── controllers/
│   │   ├── auth.controller.js  # Registration, login, Google OAuth logic
│   │   ├── trip.controller.js  # Main itinerary builder and editor logic
│   │   └── review.controller.js# Reviews and feedback management
│   ├── middleware/
│   │   ├── auth.middleware.js  # JWT route protection interceptor
│   │   └── error.middleware.js # Global error handler
│   ├── models/
│   │   ├── user.model.js     # User schemas (passwords, profiles)
│   │   ├── trip.model.js     # Complex nested trip schemas
│   │   └── review.model.js   # Customer testimonials schema
│   ├── routes/
│   │   ├── auth.routes.js    # Auth endpoint routes mapping
│   │   ├── trip.routes.js    # Protected trip endpoints routes mapping
│   │   └── review.routes.js  # Reviews endpoint routes mapping
│   ├── services/
│   │   ├── ai.service.js     # Gemini API structured prompt orchestration
│   │   ├── image.service.js  # Wikimedia/LoremFlickr search and Cloudinary cache
│   │   └── weather.service.js# OpenWeatherMap API integrations
│   └── utils/
│       └── retry.util.js     # Exponential backoff handler for API resilience
└── package.json              # Backend dependencies and scripts
```
