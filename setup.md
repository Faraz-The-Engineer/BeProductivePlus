# Backend Setup Guide

## Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
MONGO_URI=mongodb://localhost:27017/task-manager
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
SIGNUP_API_KEY=be-productive-2024-api-key
PORT=5000
```

## API Key Setup

The signup functionality now requires a valid API key:

1. Set the `SIGNUP_API_KEY` environment variable with your desired API key
2. The API key is validated via request headers (`x-api-key`)
3. The frontend automatically includes the API key in signup requests
4. See `API_KEY_SETUP.md` for detailed information about API key management

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

- POST /api/auth/signup - User registration (requires API key in headers)
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

If signup fails with "Invalid API key" or "API key is required":
1. Verify the `SIGNUP_API_KEY` environment variable is set
2. Ensure the frontend has the correct API key configured
3. Check that the API key is being sent in the `x-api-key` header 