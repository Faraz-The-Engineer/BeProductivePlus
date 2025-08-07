# API Key Setup for Signup

## Overview
The signup API now requires a valid API key to create new user accounts. The API key is validated via request headers, adding an extra layer of security and control over user registration.

## Environment Variables Required

Create a `.env` file in the backend directory with the following variables:

```env
# JWT Secret for token generation
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# API Key for signup validation
SIGNUP_API_KEY=be-productive-2024-api-key

# Server Port
PORT=5000
```

## API Key Validation

The signup endpoint (`POST /api/auth/signup`) validates the API key from request headers:

1. The API key must be provided in the `x-api-key` header
2. The API key must match the `SIGNUP_API_KEY` environment variable
3. If the API key is invalid or missing, the signup will fail with a 401 status

### Request Format
```http
POST /api/auth/signup
Content-Type: application/json
x-api-key: your-api-key-here

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword"
}
```

## Frontend Integration

The frontend automatically includes the API key in request headers:
- The API key is configured in the frontend code
- No user input required for the API key
- Clean signup form without API key field
- Automatic header injection for all signup requests

## Security Notes

- Keep your API key secure and don't commit it to version control
- Consider rotating the API key periodically
- The API key is sent via headers, not in the request body
- You can generate a new API key by updating the `SIGNUP_API_KEY` environment variable

## Testing

To test the signup functionality:
1. Set the `SIGNUP_API_KEY` environment variable
2. Ensure the frontend has the correct API key configured
3. Verify that signup fails with invalid API keys
4. Verify that signup succeeds with valid API keys

## Error Responses

- `401 Unauthorized`: Missing or invalid API key
- `500 Internal Server Error`: Server configuration error (missing environment variable)
