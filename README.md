# Campus Cab 🛺

An eco-friendly e-rickshaw booking platform designed for university campuses. Built with the MERN stack (MongoDB, Express, React, Node.js), Leaflet maps for OpenStreetMap routing, and Socket.IO for real-time tracking.

---

## 🚀 Features

- **Standard Authentication**: JWT auth, bcrypt password hashing, role protection for Students, Drivers, and Admins.
- **Student Dashboard**:
  - Book rides by selecting campus locations from dropdowns.
  - View estimated fare and distance before booking.
  - Track driver live on Leaflet (OpenStreetMap) with automatic routing lines.
  - Cancel rides before boarding.
  - Download trip receipts as PDF documents.
  - Rate and review rides.
- **Driver Dashboard**:
  - Toggle online/offline status.
  - Real-time modal alert for incoming ride requests.
  - Job tracking steps: Accept, Arrive, Start, and Complete.
  - Daily and career total earnings counters.
  - Simulated movement trajectory updates.
- **Admin Panel**:
  - Multi-attribute overview counters (Total Users, Online Drivers, Completed Rides, Total Revenue).
  - Monthly completed rides bar chart, daily rides, and daily revenue line charts (Chart.js).
  - Account actions: Suspend/reactivate drivers, delete users and profiles.
  - Global lists for user accounts and ride logs with live search.
- **Dark Mode**: Persisted light/dark theme switch.
- **Auto-Seeding**: Automatic creation of test student, driver, and admin credentials on backend startup.

---

## 🛠️ Tech Stack

- **Frontend**: React (Vite), Bootstrap 5, Bootstrap Icons, Leaflet (vanilla integration), jsPDF, Chart.js & React-Chartjs-2, Socket.IO Client, Axios.
- **Backend**: Node.js, Express.js, MongoDB (Mongoose), Socket.IO, JWT, bcryptjs, Dotenv, Cors.

---

## 📋 Predefined Campus Locations (Thapar University center)

- Main Gate
- Hostel H
- Hostel J
- Hostel C
- COS
- Library
- Admin Block
- Auditorium
- Tan Building
- G Block
- Sports Complex
- Student Activity Center
- Cafeteria

---

## ⚙️ Installation & Setup

### Prerequisites
- Node.js installed on your machine.
- MongoDB running locally on `mongodb://127.0.0.1:27017` (default MongoDB port) or an Atlas connection URI.

### Step 1: Install Backend Dependencies
Navigate to the server directory and install packages:
```bash
cd server
npm install
```

### Step 2: Configure Environment Variables
Inside the `server` folder, the project automatically creates a `.env` file containing:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/campuscab
JWT_SECRET=supersecretcampuscabjwttoken123!
NODE_ENV=development
```

### Step 3: Install Frontend Dependencies
Navigate to the client directory and install packages:
```bash
cd ../client
npm install
```

---

## 🏃 Running the Application

### Start the Backend Server
From the `server` directory:
```bash
npm run dev
```
*Note: This starts the server on port `5000` and automatically runs the database seeder if no users exist.*

### Start the React Frontend
From the `client` directory:
```bash
npm run dev
```
*Note: This starts the Vite dev server on port `3000` with local proxy rules configured to forward API and Socket traffic to port 5000.*

---

## 🔑 Seeding / Test Accounts

Upon starting the backend, the following accounts are automatically created if the database is empty:

1. **Student Account**:
   - **Email**: `student@campuscab.com`
   - **Password**: `student123`
   - **Roll No**: `102103045`

2. **Driver Account (Online)**:
   - **Email**: `driver1@campuscab.com`
   - **Password**: `driver123`
   - **Vehicle No**: `PB-11-AB-1234`
   - **Status**: Online (Available for matches immediately!)

3. **Driver Account (Offline)**:
   - **Email**: `driver2@campuscab.com`
   - **Password**: `driver123`
   - **Vehicle No**: `PB-11-CD-5678`

4. **Admin Account**:
   - **Email**: `admin@campuscab.com`
   - **Password**: `admin123`

---

## 🔀 REST API Reference

### Authentication (`/api/auth`)
- `POST /register`: Registers user (toggles between student and driver).
- `POST /login`: Log in user and generate token.
- `POST /logout`: Clear session cookies.
- `GET /me`: Fetch authenticated user profile details.

### Student Ride Actions (`/api/rides`)
- `POST /book`: Initiates ride booking and auto-allocates closest driver.
- `GET /history`: Fetch personal booking log.
- `GET /current`: Fetch current active booking details.
- `PUT /cancel/:id`: Cancels an un-boarded booking request.
- `POST /rate/:id`: Submit review and star rating.

### Driver Actions (`/api/drivers`)
- `PUT /online`: Join matching pool.
- `PUT /offline`: Leave matching pool.
- `PUT /location`: Report GPS updates (emits socket updates to passenger).
- `PUT /accept/:rideId`: Accept offered booking.
- `PUT /reject/:rideId`: Reject and auto-reassign to next nearest driver.
- `PUT /start/:rideId`: Transition booking to started.
- `PUT /complete/:rideId`: Transition booking to completed (adds fare to earnings).
- `GET /dashboard`: Fetch today's & total earnings statistics.

### Admin Actions (`/api/admin`)
- `GET /users`: Get and search user listings.
- `GET /rides`: Get and search all logs.
- `DELETE /user/:id`: Delete accounts.
- `PUT /suspend/:id`: Toggle driver suspension.
- `GET /stats`: Fetch overview analytics.
