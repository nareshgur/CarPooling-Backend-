const { string } = require("joi");
const Ride = require("../models/Ride");
const Vechile = require("../models/Vechile");
const { VechileType } = require("../utils/enums");
const { getCityCoordinates, validateCoordinates, areDefaultCoordinates } = require("../utils/locationUtils");
const axios = require("axios");

async function geocodeFreeTextLocation(name) {
  try {
    const url = `https://nominatim.openstreetmap.org/search`;
    const params = {
      q: name,
      format: "json",
      limit: 1,
      addressdetails: 0,
      countrycodes: "in",
    };
    const headers = {
      "User-Agent": "CarPoolingBackendAPI/1.0 (contact: support@example.com)",
    };
    const { data } = await axios.get(url, { params, headers, timeout: 8000 });
    if (!Array.isArray(data) || data.length === 0) return null;
    const first = data[0];
    const lat = parseFloat(first.lat);
    const lon = parseFloat(first.lon);
    if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
    return { lat, lng: lon };
  } catch (err) {
    console.warn("Geocoding failed for:", name, err?.message || err);
    return null;
  }
}

// services/RideService.js
exports.createRide = async (driverId, rideData) => {
  const validateAndCorrectLocation = (loc, fieldName) => {
    if (!loc || !loc.name) {
      throw new Error(`${fieldName} must include a name`);
    }

    // Check if coordinates are provided and valid
    if (!loc.location || !Array.isArray(loc.location.coordinates)) {
      throw new Error(`${fieldName} must include coordinates`);
    }

    if (loc.location.coordinates.length !== 2) {
      throw new Error(`${fieldName} coordinates must have [longitude, latitude]`);
    }

    // Check if coordinates are default/wrong coordinates
    if (areDefaultCoordinates(loc.location.coordinates) || !validateCoordinates(loc.location.coordinates)) {
      console.log(`Warning: ${fieldName} coordinates appear to be incorrect for ${loc.name}`);
      
      // Try to get correct coordinates for the city
      const correctCoords = getCityCoordinates(loc.name);
      if (correctCoords) {
        console.log(`Correcting ${fieldName} coordinates for ${loc.name} from [${loc.location.coordinates}] to [${correctCoords}]`);
        loc.location.coordinates = correctCoords;
      } else {
        console.log(`Could not find coordinates for ${loc.name}, using provided coordinates`);
      }
    }
  };

  // Validate and correct origin & destination
  validateAndCorrectLocation(rideData.origin, "Origin");
  validateAndCorrectLocation(rideData.destination, "Destination");

  // Validate stops if present
  if (Array.isArray(rideData.stops)) {
    rideData.stops.forEach((stop, idx) =>
      validateAndCorrectLocation(stop, `Stop ${idx + 1}`)
    );
  }
  
  console.log("Final ride data after coordinate correction:", JSON.stringify(rideData, null, 2));
  
  // Vehicle creation if ID not provided
  let vechileId = rideData.vechile;
  console.log(rideData.vechile);
  if (!vechileId && rideData.vechileInfo) {
    const newVechile = new Vechile({
      owner: driverId,
      make: rideData.vechileInfo.make,
      model: rideData.vechileInfo.model,
      plateNumber: rideData.vechileInfo.plateNumber,
      VechileType: rideData.vechileInfo.VechileType,
    });
    await newVechile.save();
    vechileId = newVechile._id;
  }

  if (!vechileId) throw new Error("Vehicle information is required");

  const ride = new Ride({
    ...rideData,
    vechile: vechileId,
    driverId,
  });

  await ride.save();
  return ride;
};

// services/RideService.js
exports.updateRideAndVehicle = async (driverId, rideId, updateData) => {
  const ride = await Ride.findOne({ _id: rideId, driverId }).populate(
    "vechile"
  );
  if (!ride) throw new Error("Ride not found or not owned by this driver");

  const validateLocation = (loc, fieldName) => {
    if (!loc) return; // skip if not provided
    if (!loc.name) throw new Error(`${fieldName} must have a name`);
    if (!loc.location || !Array.isArray(loc.location.coordinates)) {
      throw new Error(`${fieldName} must have coordinates [lng, lat]`);
    }
    if (loc.location.coordinates.length !== 2) {
      throw new Error(`${fieldName} coordinates must have exactly [lng, lat]`);
    }
  };

  // Merge + validate origin
  if (updateData.origin) {
    ride.origin = {
      ...ride.origin?.toObject(),
      ...updateData.origin,
    };
    validateLocation(ride.origin, "Origin");
  }

  // Merge + validate destination
  if (updateData.destination) {
    ride.destination = {
      ...ride.destination?.toObject(),
      ...updateData.destination,
    };
    validateLocation(ride.destination, "Destination");
  }

  // Merge + validate stops
  if (updateData.stops) {
    if (!Array.isArray(updateData.stops)) {
      throw new Error("Stops must be an array");
    }
    ride.stops = updateData.stops.map((stop, idx) => {
      const mergedStop = {
        ...ride.stops?.[idx]?.toObject(),
        ...stop,
      };
      validateLocation(mergedStop, `Stop ${idx + 1}`);
      return mergedStop;
    });
  }

  // Update other ride fields
  const allowedRideFields = ["dateTime", "availableSeats", "pricePerSeat"];
  allowedRideFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      ride[field] = updateData[field];
    }
  });

  // Vehicle update logic
  if (updateData.vechile && typeof updateData.vechile === "string") {
    const existingVehicle = await Vechile.findOne({
      _id: updateData.vechile,
      owner: driverId,
    });
    if (!existingVehicle)
      throw new Error("Vehicle not found or not owned by this driver");
    ride.vechile = existingVehicle._id;
  }

  if (updateData.vechileInfo) {
    if (ride.vechile) {
      Object.assign(ride.vechile, updateData.vechileInfo);
      await ride.vechile.save();
    } else {
      const newVehicle = new Vechile({
        owner: driverId,
        ...updateData.vechileInfo,
      });
      await newVehicle.save();
      ride.vechile = newVehicle._id;
    }
  }

  await ride.save();
  return { message: "Ride and vehicle updated successfully", ride };
};

exports.getRidesByDriver = async (driverId) => {
  return await Ride.find({ driverId })
    .populate("vechile")
    .sort({ dateTime: -1 }); // latest first
};

exports.searchRides = async (searchParams) => {
  const {
    lat,
    lng,
    maxDistance = 20000, // meters default 20km
    destLat,
    destLng,
    destMaxDistance = 20000,
    date,
    from, // free text origin
    to,   // free text destination
    passengers,
    vehicleType,
    maxPrice,
    sortBy,
  } = searchParams;

  let originIds = [];
  let destinationIds = [];
  let hasLocationSearch = false;

  // STEP 1 — Origin by name -> DB name match; else geocode; else lat/lng
  if (from) {
    hasLocationSearch = true;
    const originNameMatches = await Ride.find({
      "origin.name": { $regex: from, $options: "i" },
    }).select("_id");
    originIds = originNameMatches.map((r) => r._id.toString());
    if (originIds.length === 0) {
      // geocode free text
      const geo = await geocodeFreeTextLocation(from);
      if (geo) {
        const nearOrigin = await Ride.find({
          "origin.location": {
            $near: {
              $geometry: { type: "Point", coordinates: [geo.lng, geo.lat] },
              $maxDistance: parseInt(maxDistance),
            },
          },
        }).select("_id");
        originIds = nearOrigin.map((r) => r._id.toString());
      }
    }
  } else if (lat && lng) {
    hasLocationSearch = true;
    const originMatches = await Ride.find({
      "origin.location": {
        $near: {
          $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseInt(maxDistance),
        },
      },
    }).select("_id");
    originIds = originMatches.map((r) => r._id.toString());
  }

  // STEP 2 — Destination
  if (to) {
    hasLocationSearch = true;
    const destNameMatches = await Ride.find({
      "destination.name": { $regex: to, $options: "i" },
    }).select("_id");
    destinationIds = destNameMatches.map((r) => r._id.toString());
    console.log("Destination IDs found are : ", JSON.parse(JSON.stringify(destinationIds)));
    if (destinationIds.length === 0) {
      const geo = await geocodeFreeTextLocation(to);
      if (geo) {
        const nearDest = await Ride.find({
          "destination.location": {
            $near: {
              $geometry: { type: "Point", coordinates: [geo.lng, geo.lat] },
              $maxDistance: parseInt(destMaxDistance),
            },
          },
        }).select("_id");
        destinationIds = nearDest.map((r) => r._id.toString());
      }
    }
  } else if (destLat && destLng) {
    hasLocationSearch = true;
    const destMatches = await Ride.find({
      "destination.location": {
        $near: {
          $geometry: { type: "Point", coordinates: [parseFloat(destLng), parseFloat(destLat)] },
          $maxDistance: parseInt(destMaxDistance),
        },
      },
    }).select("_id");
    destinationIds = destMatches.map((r) => r._id.toString());
  }

  // STEP 3 — Combine
  let finalIds = [];
  if (originIds.length && destinationIds.length) {
    const originSet = new Set(originIds);
    finalIds = destinationIds.filter((id) => originSet.has(id));
    console.log("Final IDs found are : ", JSON.parse(JSON.stringify(finalIds)));
  } else if (originIds.length) {
    finalIds = originIds;
  } else if (destinationIds.length) {
    finalIds = destinationIds;
  } else if (hasLocationSearch) {
    // No location results at all
    return [];
  }

  // STEP 4 — Build query
  let query = {};
  if (finalIds.length > 0) {
    query._id = { $in: finalIds };
    console.log("Query found are : ", JSON.parse(JSON.stringify(query)));
  } else if (hasLocationSearch) {
    return [];
  }

  // Date filter
  if (date) {
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    query.dateTime = { $gte: start, $lte: end };
    console.log("Date filter found are : ", JSON.parse(JSON.stringify(query)));
  }

  // Passengers filter
  if (passengers) {
    query.availableSeats = { $gte: parseInt(passengers) };
  }

  // Max price filter
  if (maxPrice !== undefined && maxPrice !== null && maxPrice !== "") {
    const p = parseFloat(maxPrice);
    if (!Number.isNaN(p)) {
      query.pricePerSeat = { ...(query.pricePerSeat || {}), $lte: p };
    }
  }

  // Fetch
  let rides = await Ride.find(query)
    .populate("vechile")
    .populate("driverId", "name email phone rating totalTrips verificationStatus");
  console.log("Rides found are : ", JSON.parse(JSON.stringify(rides)));
  console.log("Vehicle Type found are : ", JSON.parse(JSON.stringify(vehicleType)));
  // Vehicle filter
  if (vehicleType && vehicleType !== "all") {
    rides = rides.filter(
      (ride) => ride.vechile?.type && ride.vechile.type.toLowerCase() === vehicleType.toLowerCase()
    );
  }

  // Sort
  if (sortBy === "departure") {
    rides.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
  } else if (sortBy === "price_asc") {
    rides.sort((a, b) => (a.pricePerSeat || 0) - (b.pricePerSeat || 0));
  } else if (sortBy === "price_desc") {
    rides.sort((a, b) => (b.pricePerSeat || 0) - (a.pricePerSeat || 0));
  }

  // Transform
  console.log("Rides found are : ", JSON.parse(JSON.stringify(rides)));

  return rides;
};