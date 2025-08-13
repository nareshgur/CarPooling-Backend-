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

  const result = await Ride.find(query);
  console.log("Query", JSON.parse(JSON.stringify(result)));
  // STEP 5 — Fetch rides with full details
  const rides = await Ride.find(query)
    .populate("vechile") // Populate vehicle details
    .populate("driverId", "name email phone rating totalTrips verificationStatus"); // Populate driver details


  console.log("Rides", JSON.parse(JSON.stringify(rides)));
  console.log("Date from the frontend", date);
  console.log("Fetching the results between the ", start, end);
  
  // Transform the data to match frontend expectations
  const transformedRides = rides.map(ride => ({
    id: ride._id,
    driverId: ride.driverId,
    vehicle: {
      id: ride.vechile._id,
      type: ride.vechile.type || "car",
      make: ride.vechile.make || "Unknown",
      model: ride.vechile.model || "Unknown",
      year: ride.vechile.year || 2024,
      color: ride.vechile.color || "Unknown",
      licensePlate: ride.vechile.licensePlate || "Unknown",
      features: ride.vechile.features || [],
    },
    driver: {
      id: ride.driverId,
      name: ride.driverId?.name || "Driver Name",
      email: ride.driverId?.email || "driver@example.com",
      phone: ride.driverId?.phone || "+1234567890",
      rating: ride.driverId?.rating || 4.5,
      totalTrips: ride.driverId?.totalTrips || 10,
      verificationStatus: ride.driverId?.verificationStatus || "verified",
    },
    from: {
      id: "loc1",
      name: ride.origin.name,
      address: ride.origin.name, // You might want to add address field to your schema
      coordinates: ride.origin.location.coordinates,
    },
    to: {
      id: "loc2",
      name: ride.destination.name,
      address: ride.destination.name, // You might want to add address field to your schema
      coordinates: ride.destination.location.coordinates,
    },
    departureTime: ride.dateTime,
    arrivalTime: ride.dateTime, // You might want to calculate this based on distance
    availableSeats: ride.availableSeats,
    pricePerSeat: ride.pricePerSeat,
    description: `Ride from ${ride.origin.name} to ${ride.destination.name}`,
    status: "active",
    bookings: [],
    createdAt: ride.dateTime,
    route: {
      distance: 0, // You might want to calculate this
      duration: 0, // You might want to calculate this
    },
  }));

  return transformedRides;
};