# cURL Primeri za Testiranje Auth API

Svi primeri pretpostavljaju da server radi na `http://localhost:3000`

## Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

## Registracija Klijenta

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "password123",
    "firstName": "Petar",
    "lastName": "Petrović",
    "phone": "+381641234567",
    "preferredCommunication": "email"
  }'
```

## Registracija Provajdera (Biznis)

```bash
curl -X POST http://localhost:3000/api/auth/register/business \
  -H "Content-Type: application/json" \
  -d '{
    "email": "salon@example.com",
    "password": "password123",
    "firstName": "Marija",
    "lastName": "Marić",
    "phone": "+381641234567",
    "businessName": "Beauty Salon Marija",
    "businessCategory": "salon",
    "pib": "123456789",
    "businessPhone": "+381111234567"
  }'
```

## Forgot Password

```bash
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

## Reset Password

```bash
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "reset-token-from-email",
    "password": "newPassword123",
    "confirmPassword": "newPassword123"
  }'
```

## Verify Email

```bash
curl -X POST http://localhost:3000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "token": "verification-token-from-email"
  }'
```

## Refresh Token

```bash
curl -X POST http://localhost:3000/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "your-refresh-token-here"
  }'
```

## Zaštićeni Endpoint Primer (sa tokenom)

```bash
curl -X GET http://localhost:3000/api/protected-route \
  -H "Authorization: Bearer your-access-token-here"
```

## Health Check

```bash
curl http://localhost:3000/health
```
