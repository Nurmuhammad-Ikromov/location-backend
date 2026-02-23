const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const crypto = require("crypto");
const path = require("path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env") });

const Location = require("./models/Location");
const User = require("./models/User");

const app = express();
const allowedOrigins = [
  "http://127.0.0.1:5500",
  "http://127.0.0.1:5501",
  "http://localhost:5500",
  "http://127.0.0.1:3000",
  "http://localhost:3000",
  "https://nafisa-self.vercel.app",
  "https://location-admin.vercel.app"
];

const corsOptions = {
  origin(origin, callback) {
    // Postman/server-to-server requests may not send Origin header.
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("CORS: origin ruxsat etilmagan"));
  },
  credentials: true,
};

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
    res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json());

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI;
const SELF_PING_INTERVAL_MS = Number(process.env.SELF_PING_INTERVAL_MS || 300000);
const SELF_PING_ENABLED = process.env.SELF_PING_ENABLED !== "false";
const parsedTokenTtl = Number(process.env.TOKEN_EXPIRES_IN_SEC);
const TOKEN_EXPIRES_IN_SEC =
  Number.isFinite(parsedTokenTtl) && parsedTokenTtl > 0
    ? parsedTokenTtl
    : 60 * 60 * 24 * 7;
const JWT_SECRET = process.env.JWT_SECRET || "change-this-jwt-secret";

if (!MONGODB_URI) {
  console.error("Xatolik: .env ichida MONGODB_URI topilmadi.");
  process.exit(1);
}

function toBase64Url(base64Value) {
  return base64Value
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function encodeBase64Url(input) {
  return toBase64Url(Buffer.from(input).toString("base64"));
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hashed = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hashed}`;
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = String(storedHash || "").split(":");
  if (!salt || !hash) return false;

  const calculatedHash = crypto.scryptSync(password, salt, 64);
  const originalHash = Buffer.from(hash, "hex");
  if (calculatedHash.length !== originalHash.length) return false;

  return crypto.timingSafeEqual(calculatedHash, originalHash);
}

function createToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const header = encodeBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = encodeBase64Url(
    JSON.stringify({
      sub: String(user._id),
      email: user.email,
      iat: now,
      exp: now + TOKEN_EXPIRES_IN_SEC,
    })
  );
  const unsignedToken = `${header}.${payload}`;
  const signature = toBase64Url(
    crypto.createHmac("sha256", JWT_SECRET).update(unsignedToken).digest("base64")
  );

  return `${unsignedToken}.${signature}`;
}

function getNameFields(body) {
  const firstName = String(body.firstName ?? body.ism ?? body.name ?? "").trim();
  const lastName = String(body.lastName ?? body.familya ?? body.surname ?? "").trim();

  return { firstName, lastName };
}

function serializeUser(user) {
  return {
    id: String(user._id),
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
  };
}

app.post("/register", async (req, res) => {
  try {
    const { firstName, lastName } = getNameFields(req.body || {});
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        message: "Ism, familya, email va parol majburiy.",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        message: "Email noto'g'ri formatda.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Parol kamida 6 ta belgidan iborat bo'lishi kerak.",
      });
    }

    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      return res.status(409).json({
        message: "Bu email allaqachon ro'yxatdan o'tgan.",
      });
    }

    const user = await User.create({
      firstName,
      lastName,
      email,
      passwordHash: hashPassword(password),
    });
    const token = createToken(user);

    return res.status(201).json({
      token,
      user: serializeUser(user),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        message: "Bu email allaqachon ro'yxatdan o'tgan.",
      });
    }

    return res.status(500).json({
      message: "Ro'yxatdan o'tishda xatolik yuz berdi.",
      error: error.message,
    });
  }
});

app.post("/login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (!email || !password) {
      return res.status(400).json({
        message: "Email va parol majburiy.",
      });
    }

    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({
        message: "Email yoki parol noto'g'ri.",
      });
    }

    const token = createToken(user);

    return res.status(200).json({
      token,
      user: serializeUser(user),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Login qilishda xatolik yuz berdi.",
      error: error.message,
    });
  }
});

// app.post("/locations", async (req, res) => {
//   try {
//     const payload = req.body;
//     const location = new Location(payload);
//     await location.save({ validateBeforeSave: false });
//     res.status(201).json(location);
//   } catch (error) {
//     res.status(400).json({
//       message: "Ma'lumotni saqlab bo'lmadi",
//       error: error.message,
//     });
//   }
// });

// app.get("/locations", async (_req, res) => {
//   try {
//     const locations = await Location.find().sort({ createdAt: -1 });
//     res.json(locations);
//   } catch (error) {
//     res.status(500).json({
//       message: "Ma'lumotlarni olib bo'lmadi",
//       error: error.message,
//     });
//   }
// });

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true, uptime: process.uptime() });
});

function startSelfPing() {
  if (!SELF_PING_ENABLED) return;

  const baseUrl =
    process.env.RENDER_EXTERNAL_URL || `http://127.0.0.1:${PORT}`;
  const pingUrl = `${baseUrl}/health`;

  setInterval(async () => {
    try {
      await fetch(pingUrl);
      console.log(`[self-ping] ok: ${pingUrl}`);
    } catch (error) {
      console.error(`[self-ping] failed: ${error.message}`);
    }
  }, SELF_PING_INTERVAL_MS);
}

async function start() {
  try {
    await mongoose.connect(MONGODB_URI);
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log("MongoDB ulandi.");
      startSelfPing();
    });
  } catch (error) {
    console.error("MongoDB ulanishida xatolik:", error.message);
    process.exit(1);
  }
}

start();
