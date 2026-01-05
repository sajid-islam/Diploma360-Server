# Event Management Backend API

A scalable and secure backend API for the Event Management Platform.  
This server handles authentication, role-based access, event management, registrations, reviews, and student timelines.

Built with **Node.js, Express, MongoDB**, and follows the **MVC (Model–View–Controller) architecture**.

---

## Tech Stack

- **Node.js**
- **Express.js**
- **MongoDB + Mongoose**
- **JWT Authentication (Cookie-based)**
- **Role-based Authorization**
- **MVC Architecture**

---

## Architecture Pattern

This project strictly follows the **MVC Pattern**:

- **Model** → Database schemas (MongoDB)
- **Routes** → API endpoints
- **Middleware** → Auth, role verification, error handling

This structure ensures:

- Clean separation of concerns
- Easy scalability
- Better maintainability

---

## Folder Structure

```
└── 📁src
    └── 📁lib
        ├── cloudinary.js
        ├── cron.js
        ├── db.js
        ├── generateToken.js
    └── 📁middleware
        ├── verifyAdmin.middleware.js
        ├── verifyRole.middleware.js
        ├── verifyToken.middleware.js
    └── 📁models
        ├── Event.js
        ├── User.js
    └── 📁routes
        ├── eventRoutes.js
        ├── userRoutes.js
    └── index.js
```

---

## Authentication & Authorization

- JWT stored in **HTTP-only cookies**
- Role-based access control:
  - `student`
  - `organizer`
  - `super_admin`
- Protected routes using middleware

---

## Core Features

### User Management

- Firebase UID based user creation
- Role assignment (Super Admin only)
- Secure login/logout

### Event Management

- Create, update, delete events
- Online & physical events
- Seat limit & deadlines

### Registrations

- Embedded registrations inside Event schema
- Payment status tracking
- Ticket & QR code support

### Reviews

- Event-based reviews
- Rating & comments
- Organizer & admin visibility

### Student Timeline

- Shows registered events
- Join status & join time
- Online event join links

---

## Run Locally

Follow these steps to run the backend server on your local machine.

### 1. Clone the Repository

```bash
git clone https://github.com/sajid-islam/Diploma360-Server
cd Diploma360-Server
npm install

```

### 2. Setup Environment Variables

```env
MONGODB_URI=mongodb+srv://username:password@cluster0.mongodb.net/mydatabase?retryWrites=true&w=majority
JWT_SECRET=super_secret_jwt_key_123456
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=cloudinary_api_secret_here
CLOUDINARY_CLOUD_NAME=my_cloud_name
API_URL=http://localhost:5000
```

### 3. Start the Server

```
npm run dev

```
