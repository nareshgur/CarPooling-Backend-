const { string } = require("joi");
const Ride = require("../models/Ride");
const Vechile = require("../models/Vechile");
const { VechileType } = require("../utils/enums");

// services/RideService.js
exports.createRide = async (driverId, rideData) => {
  const validateLocation = (loc, fieldName) => {
    if (
      !loc ||
      !loc.name ||
      !loc.location ||
      !Array.isArray(loc.location.coordinates)
    ) {
      throw new Error(`${fieldName} must include name and coordinates`);
    }
    if (loc.location.coordinates.length !== 2) {
      throw new Error(
        `${fieldName} coordinates must have [longitude, latitude]`
      );
    }
  };

  // Validate origin & destination
  validateLocation(rideData.origin, "Origin");
  validateLocation(rideData.destination, "Destination");

  // Validate stops if present
  if (Array.isArray(rideData.stops)) {
    rideData.stops.forEach((stop, idx) =>
      validateLocation(stop, `Stop ${idx + 1}`)
    );
  }
  console.log(rideData);
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

exports.getRidesBookedByUser = async (userId) => {
  const bookings = await Booking.find({ passengerId: userId }).populate({
    path: "rideId",
    populate: { path: "vechile" },
  });
  return bookings.map((b) => b.rideId);
};

// services/RideService.js
exports.searchRides = async (searchParams) => {
  const {
    lat,
    lng,
    maxDistance = 5000,
    destLat,
    destLng,
    destMaxDistance = 5000,
    date,
  } = searchParams;

  let originIds = [];
  let destinationIds = [];

  // STEP 1 — Find rides near origin
  if (lat && lng) {
    const originMatches = await Ride.find({
      "origin.location": {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: parseInt(maxDistance),
        },
      },
    }).select("_id");
    originIds = originMatches.map((r) => r._id.toString());
  }

  // STEP 2 — Find rides near destination
  if (destLat && destLng) {
    const destMatches = await Ride.find({
      "destination.location": {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(destLng), parseFloat(destLat)],
          },
          $maxDistance: parseInt(destMaxDistance),
        },
      },
    }).select("_id");
    destinationIds = destMatches.map((r) => r._id.toString());
  }

  // STEP 3 — Determine final matching IDs
  let finalIds = [];
  if (originIds.length && destinationIds.length) {
    // Intersection of origin and destination results
    const originSet = new Set(originIds);
    finalIds = destinationIds.filter((id) => originSet.has(id));
  } else if (originIds.length) {
    finalIds = originIds;
  } else if (destinationIds.length) {
    finalIds = destinationIds;
  }

  // STEP 4 — Build main query
  let query = {};
  if (finalIds.length) {
    query._id = { $in: finalIds };
  }

  let start;
  let end;

  // Date filter
  if (date) {
    start = new Date(date);
    end = new Date(date);
    end.setHours(23, 59, 59, 999);
    query.dateTime = { $gte: start, $lte: end };
  }

  // STEP 5 — Fetch rides with full details
  const rides = await Ride.find(query).populate("vechile");
  console.log("Date from the frontend", date);
  console.log("Fetching the results between the ", start, end);
  return rides;
};
