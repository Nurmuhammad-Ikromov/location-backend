const mongoose = require("mongoose");

function toNullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toDateOrNow(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

const providerLocationSchema = new mongoose.Schema(
  {
    status: { type: String, default: "" },
    latitude: { type: Number, default: null, set: toNullableNumber },
    longitude: { type: Number, default: null, set: toNullableNumber },
  },
  { _id: false }
);

const locationSchema = new mongoose.Schema(
  {
    createdAt: { type: Date, default: Date.now, set: toDateOrNow },
    name: { type: String, default: null, trim: true },
    locations: {
      navigation: { type: providerLocationSchema, default: () => ({}) },
      ipwho: { type: providerLocationSchema, default: () => ({}) },
      ipapi: { type: providerLocationSchema, default: () => ({}) },
    },
    raw: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    versionKey: false,
  }
);

module.exports = mongoose.model("Location", locationSchema);
