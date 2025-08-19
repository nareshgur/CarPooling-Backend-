const express = require("express");
const axios = require("axios");
const router = express.Router();

const ORS_API_KEY = process.env.ORS_API_KEY;

if (!ORS_API_KEY) {
  console.error("⚠️ ORS_API_KEY environment variable is not set! Add it to your .env");
}

// POST /api/directions
router.post("/", async (req, res) => {
  try {
    if (!ORS_API_KEY) {
      return res.status(500).json({
        error: "ORS API key not configured. Please check server configuration.",
      });
    }

    const { coordinates, alternatives } = req.body || {};
    if (
      !Array.isArray(coordinates) ||
      coordinates.length !== 2 ||
      !Array.isArray(coordinates[0]) ||
      !Array.isArray(coordinates[1])
    ) {
      return res.status(400).json({
        error:
          "Invalid body. Expect { coordinates: [[lng,lat],[lng,lat]], alternatives?: boolean }",
      });
    }

    const orsBody = {
      coordinates,
      instructions: false,
      geometry: true,
      // geometry_format: "encodedpolyline",  ❌ remove this line
      ...(alternatives
        ? { alternative_routes: { target_count: 3, share_factor: 0.6 } }
        : {}),
    };
    

    const orsRes = await axios.post(
      "https://api.openrouteservice.org/v2/directions/driving-car",
      orsBody,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: ORS_API_KEY,
        },
        timeout: 15000,
      }
    );

    res.json(orsRes.data);
  } catch (err) {
    const status = err.response?.status || 500;
    const details = err.response?.data || err.message;
    console.error("ORS error:", details);
    res.status(500).json({
      error: "Failed to fetch directions",
      details,
      status,
    });
  }
});

// GET /api/directions/geocode?query=...
router.get("/geocode", async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ message: "Query parameter required" });
    }

    const response = await axios.get(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent": "CarPoolingApp/1.0 (contact@example.com)",
          Accept: "application/json",
        },
        timeout: 10000,
      }
    );

    res.json(response.data);
  } catch (err) {
    console.error("Geocoding error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to geocode address" });
  }
});

module.exports = router;
