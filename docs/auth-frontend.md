# Frontend Auth Documentation

Bu hujjat frontend tarafdan `register` va `login` endpointlarini ulash uchun.

## Base URL

Local:

```txt
http://localhost:4000
```

Production:

```txt
https://<your-backend-domain>
```

Har bir request uchun header:

```http
Content-Type: application/json
```

## 1) Register

Endpoint:

```http
POST /register
```

Body (`JSON`):

```json
{
  "firstName": "Ali",
  "lastName": "Valiyev",
  "email": "ali@example.com",
  "password": "secret123"
}
```

`firstName` o'rniga `ism`, `lastName` o'rniga `familya` yuborish ham mumkin.

Success response (`201`):

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

Error responses:

- `400`: `Ism, familya, email va parol majburiy.`
- `400`: `Email noto'g'ri formatda.`
- `400`: `Parol kamida 6 ta belgidan iborat bo'lishi kerak.`
- `409`: `Bu email allaqachon ro'yxatdan o'tgan.`
- `500`: `Ro'yxatdan o'tishda xatolik yuz berdi.`

## 2) Login

Endpoint:

```http
POST /login
```

Body (`JSON`):

```json
{
  "email": "ali@example.com",
  "password": "secret123"
}
```

Success response (`200`):

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

Error responses:

- `400`: `Email va parol majburiy.`
- `401`: `Email yoki parol noto'g'ri.`
- `500`: `Login qilishda xatolik yuz berdi.`

## 3) Frontend Flow

1. User formani to'ldiradi.
2. `POST /register` yoki `POST /login` yuboriladi.
3. Response ichidagi `token` va `user` saqlanadi.
4. Auth talab qiladigan sahifalarda token bilan request yuboriladi:

```http
Authorization: Bearer <token>
```

## 4) Fetch Example

```js
const API_BASE = "http://localhost:4000";

export async function register(payload) {
  const res = await fetch(`${API_BASE}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Register error");

  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));
  return data;
}

export async function login(payload) {
  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Login error");

  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));
  return data;
}
```

## 5) Axios Example

```js
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:4000",
  headers: { "Content-Type": "application/json" },
});

export async function register(payload) {
  const { data } = await api.post("/register", payload);
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));
  return data;
}

export async function login(payload) {
  const { data } = await api.post("/login", payload);
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));
  return data;
}
```

## 6) Minimal Validation (Frontend)

- `email`: bo'sh bo'lmasin, email formatda bo'lsin.
- `password`: kamida `6` belgi.
- Registerda `firstName` va `lastName` bo'sh bo'lmasin.

## 7) Logout

```js
localStorage.removeItem("token");
localStorage.removeItem("user");
```

