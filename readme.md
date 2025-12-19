# 🎥 YouTube Clone – Backend

A **full‑stack YouTube clone backend** built with **Node.js, Express, and MongoDB**, designed to handle authentication, video management, likes, playlists, comments, subscriptions, and user interactions.
This project represents my **first large full‑stack backend** and is built with a strong focus on **clean architecture, scalability, and real‑world features**.

---

## 📌 Project Overview

This project is a **YouTube backend clone** built using **Node.js**, **Express**, **Mongoose**, and **MongoDB**.

Initially, it started as a **learning project**, inspired by the amazing tutorials of **Hitesh Choudhary** from the **Chai aur Code** YouTube channel.
All **credits** go to him for teaching backend development from scratch in a **clear and beginner-friendly** way.

Over time, the project evolved into a **feature-rich backend system**, focusing on real-world patterns, clean architecture, and scalable design.

**Project Level**
🟡 Intermediate

---

## 🛠️ Tech Stack

### Backend

* **Node.js**
* **Express.js** (v5)
* **MongoDB** with **Mongoose**

### Authentication & Security

* JWT (Access & Refresh Tokens)
* bcrypt for password hashing
* Cookie‑based auth support

### Media Handling

* Multer (file uploads)
* Cloudinary (video & image storage)

### Utilities & Tooling

* dotenv
* CORS
* mongoose‑aggregate‑paginate‑v2
* Nodemon
* Prettier

---

## ✨ Core Features

> This backend follows a **production-style architecture** with reusable utilities, custom error handling, async middleware, aggregation-heavy queries, and external media storage integration.

### 👤 User & Authentication

* User registration with avatar & cover image upload
* Login & logout
* Access & refresh token flow
* Change password
* Get current logged‑in user
* Update profile (avatar & cover image)

### 📺 Videos

* Publish videos with thumbnail
* Update video details
* Delete videos
* Get all videos (paginated)
* Get single video by ID
* Video view count support

### ❤️ Likes System

* Like / unlike videos
* Like / unlike comments
* Like / unlike posts
* Get all liked videos

### 💬 Comments

* Add comments on videos
* Update comments
* Delete comments
* Paginated comments using aggregation

### 📂 Playlists

* Create playlists
* Update playlists
* Delete playlists
* Add / remove videos from playlists
* Owned vs saved playlists

### 📌 Subscriptions

* Subscribe / unsubscribe to channels
* Get channel subscribers
* Get user subscribed channels

### 🕒 Watch History

* Add video to watch history
* Fetch user watch history

### 📝 Posts (Community‑style)

* Create posts
* Update posts
* Delete posts
* Fetch all posts
* Fetch user‑specific posts

---

## 🧩 Core Architecture & Utilities

### 🔁 Async Error Handling (`asyncHandler`)

All controllers are wrapped using a custom `asyncHandler` utility. This removes repetitive `try/catch` blocks and forwards errors directly to the global error middleware.

**Why this matters**:

* Cleaner controllers
* Centralized error handling
* Production-grade async flow

---

### ❌ Custom Error Handling (`ApiError`)

A reusable `ApiError` class is used across the project to throw structured, consistent errors.

**Supports**:

* HTTP status codes
* Custom messages
* Optional error arrays
* Stack trace preservation

This ensures **predictable API error responses** and easier debugging.

---

### ✅ Unified API Responses (`ApiResponse`)

All successful API responses follow a consistent format using a custom `ApiResponse` class.

**Benefits**:

* Standard response structure
* Easy frontend consumption
* Clear success/failure semantics

---

### ☁️ Cloudinary Media Management

All videos, thumbnails, avatars, and cover images are handled via **Cloudinary**.

**Features**:

* Automatic upload (image & video)
* Safe local file cleanup
* Public ID tracking for deletion
* Supports large video uploads

---

### 🔐 JWT Authentication Middleware (`verifyJWT`)

Protected routes use a custom JWT verification middleware that:

* Extracts token from cookies or headers
* Verifies access token
* Attaches authenticated user to `req.user`

---

### 📤 File Upload Handling (Multer)

Multer is configured with disk storage for temporary file handling before Cloudinary upload.

---

## 📁 Folder Structure

```
src/
│── controllers/    # Business logic for routes
│── db/             # Database connection
│── middlewares/    # Auth, multer, error handling
│── models/         # Mongoose schemas
│── routes/         # API routes
│── utils/          # Helpers (cloudinary, responses, etc.)
│── app.js          # Express app setup
│── index.js        # Server entry point
```

This structure follows a **clean separation of concerns**, making the project easier to scale and maintain.

---

## 🔐 API Security

* Protected routes using `verifyJWT` middleware
* Passwords hashed using bcrypt
* Refresh token rotation support
* Secure token expiry handling

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory:

```
PORT=8000
MONGODB_URI=your_mongodb_uri

ACCESS_TOKEN_SECRET=your_access_secret
ACCESS_TOKEN_EXPIRY=15m

REFRESH_TOKEN_SECRET=your_refresh_secret
REFRESH_TOKEN_EXPIRY=7d

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## ▶️ Installation & Running Locally

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run in production
npm start
```

---

## 📦 Scripts

| Command       | Description               |
| ------------- | ------------------------- |
| `npm run dev` | Start server with nodemon |
| `npm start`   | Start server normally     |

---

## 🧠 What I Learned

* Designing RESTful APIs
* JWT authentication with refresh tokens
* Handling media uploads at scale
* MongoDB aggregation pipelines
* Structuring a large backend project
* Writing reusable middleware & utilities

---

## 🚀 Future Improvements

* Role‑based access control (admin / creator)
* Video recommendation system
* Search & advanced filtering
* Real‑time notifications
* API documentation with Swagger

---

## 👤 Author

**Rajendra Behera**
Full stack web developer

* Frontend: [https://github.com/BRajendra10/youtube-frontend](https://github.com/BRajendra10/youtube-frontend)
* GitHub: [https://github.com/BRajendra10](https://github.com/BRajendra10)
* LinkedIn: [https://www.linkedin.com/in/behera-rajendra/](https://www.linkedin.com/in/behera-rajendra/)

---

⭐ If you find this project useful or inspiring, consider giving it a star!
