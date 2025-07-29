# Backend Setup Guide

## Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
MONGO_URI=mongodb://localhost:27017/task-manager
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=5000
```

## MongoDB Setup

1. Install MongoDB locally or use MongoDB Atlas (cloud)
2. If using local MongoDB, make sure it's running on port 27017
3. The database will be created automatically when you first run the application

## Running the Backend

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. The server will run on http://localhost:5000

## API Endpoints

- POST /api/auth/signup - User registration
- POST /api/auth/login - User login
- GET /api/tasks - Get all tasks
- POST /api/tasks - Create new task
- PUT /api/tasks/:id - Update task
- DELETE /api/tasks/:id - Delete task

## Troubleshooting

If you get a 404 error for registration:
1. Make sure MongoDB is running
2. Check that the .env file exists and has the correct values
3. Verify the server is running on port 5000
4. Check the console for any error messages 