# Location Backend

Node.js + Express + MongoDB backend.

## Run

1. `.env.example` fayldan nusxa olib `.env` yarating.
2. `npm install`
3. `npm start`

## Endpoints

Frontend uchun auth integratsiya hujjati:

- `docs/auth-frontend.md`

### POST `/register`

Request body:

```json
{
  "firstName": "Ali",
  "lastName": "Valiyev",
  "email": "ali@example.com",
  "password": "secret123"
}
```

`firstName` o'rniga `ism`, `lastName` o'rniga `familya` yuborish ham mumkin.

Response:

```json
{
  "token": "jwt_token",
  "user": {
    "id": "mongo_user_id",
    "firstName": "Ali",
    "lastName": "Valiyev",
    "email": "ali@example.com"
  }
}
```

### POST `/login`

Request body:

```json
{
  "email": "ali@example.com",
  "password": "secret123"
}
```

Response:

```json
{
  "token": "jwt_token",
  "user": {
    "id": "mongo_user_id",
    "firstName": "Ali",
    "lastName": "Valiyev",
    "email": "ali@example.com"
  }
}
```

### POST `/locations`

Request body:

```json
{
  "createdAt": "2026-02-16T12:00:00.000Z",
  "name": "NAFISA",
  "locations": {
    "navigation": { "status": "ok", "latitude": 41.3, "longitude": 69.2 },
    "ipwho": { "status": "ok", "latitude": 41.31, "longitude": 69.21 },
    "ipapi": { "status": "ok", "latitude": 41.32, "longitude": 69.22 }
  },
  "raw": { "source": "full source data" }
}
```

### GET `/locations`

Barcha saqlangan yozuvlarni qaytaradi (eng yangi birinchi).
