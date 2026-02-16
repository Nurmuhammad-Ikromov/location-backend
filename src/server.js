const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env") });

const Location = require("./models/Location");

const app = express();
const allowedOrigins = [
  "http://127.0.0.1:5500",
  "http://127.0.0.1:5501",
  "http://localhost:5500",
  "http://127.0.0.1:3000",
  "http://localhost:3000",
  "https://nafisa-self.vercel.app"
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

if (!MONGODB_URI) {
  console.error("Xatolik: .env ichida MONGODB_URI topilmadi.");
  process.exit(1);
}

app.post("/locations", async (req, res) => {
  try {
    const payload = req.body;
    const location = new Location(payload);
    await location.save({ validateBeforeSave: false });
    res.status(201).json(location);
  } catch (error) {
    res.status(400).json({
      message: "Ma'lumotni saqlab bo'lmadi",
      error: error.message,
    });
  }
});

app.get("/locations", async (_req, res) => {
  try {
    const locations = await Location.find().sort({ createdAt: -1 });
    res.json(locations);
  } catch (error) {
    res.status(500).json({
      message: "Ma'lumotlarni olib bo'lmadi",
      error: error.message,
    });
  }
});

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
