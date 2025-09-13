const { string } = require("joi");
const Ride = require("../models/Ride");
const Vechile = require("../models/Vechile");
const { VechileType } = require("../utils/enums");
const { 
  getCityCoordinates, 
  validateCoordinates, 
  areDefaultCoordinates,
  calculateDistance,
  getRouteFromOSRM,
  calculateRouteSegments,
  geocodeWithRouteSnapping,
  geocodeFreeTextLocation  // Add this import
} = require("../utils/locationUtils");
const axios = require("axios");
const CacheService = require('./CacheService');

// Remove the geocodeFreeTextLocation function definition from here
// async function geocodeFreeTextLocation(name) { ... }

function findLocationMatches(searchTerm, locationField) {
  const searchLower = searchTerm.toLowerCase();
  
  // Try exact match first
  const exactMatches = Ride.find({
    [locationField]: { $regex: `^${searchTerm}$`, $options: "i" }
  });
  
  // Try contains match
  const containsMatches = Ride.find({
    [locationField]: { $regex: searchTerm, $options: "i" }
  });
  
  // Try word boundary matches (for cases like "Vinayak Nagar" matching "Nizamabad")
  const wordMatches = Ride.find({
    [locationField]: { $regex: `\\b${searchTerm}\\b`, $options: "i" }
  });
  
  return Promise.all([exactMatches, containsMatches, wordMatches]);
}

// services/RideService.js
// services/RideService.js
exports.createRide = async (driverId, rideData) => {
  console.log("The console log Ride Service ", driverId, rideData);

  const validateAndCorrectLocation = (loc, fieldName) => {
    if (!loc || !loc.name) {
      throw new Error(`${fieldName} must include a name`);
    }

    if (!Array.isArray(loc.coordinates)) {
      throw new Error(`${fieldName} must include coordinates`);
    }

    if (loc.coordinates.length !== 2) {
      throw new Error(`${fieldName} coordinates must have [longitude, latitude]`);
    }

    // Correct if default/wrong
    if (areDefaultCoordinates(loc.coordinates) || !validateCoordinates(loc.coordinates)) {
      console.log(`Warning: ${fieldName} coordinates appear to be incorrect for ${loc.name}`);
      const correctCoords = getCityCoordinates(loc.name);
      if (correctCoords) {
        loc.coordinates = correctCoords;
      }
    }

    // ✅ always normalize to GeoJSON
    loc.location = {
      type: "Point",
      coordinates: loc.coordinates,
    };
  };

  // Validate and correct origin & destination
  validateAndCorrectLocation(rideData.origin, "Origin");
  validateAndCorrectLocation(rideData.destination, "Destination");

  console.log("Origin and destionation coordinates after validation and correction",rideData.origin,rideData.destination)
  // Validate stops if present
  if (Array.isArray(rideData.stops)) {
    rideData.stops.forEach((stop, idx) =>
      validateAndCorrectLocation(stop, `Stop ${idx + 1}`)
    );
  }

  console.log("Final ride data after coordinate correction:", JSON.stringify(rideData, null, 2));

  let vechileId = rideData.vechile;

  if (!vechileId && rideData.vechileInfo) {
    // 1. Check if a vehicle with same plateNumber already exists for this driver
    let existingVehicle = await Vechile.findOne({
      plateNumber: rideData.vechileInfo.plateNumber,
      owner: driverId
    });

    if (existingVehicle) {
      console.log("Reusing existing vehicle:", existingVehicle.plateNumber);
      vechileId = existingVehicle._id;
    } else {
      // 2. Otherwise create a new one
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
  }

  if (!vechileId) throw new Error("Vehicle information is required");

  const ride = new Ride({
    ...rideData,
    vechile: vechileId,
    driverId,
  });

  await ride.save();
  console.log("Ride created successfully",ride)
  return ride;
};


// services/RideService.js
// exports.updateRideAndVehicle = async (driverId, rideId, updateData) => {
//   const ride = await Ride.findOne({ _id: rideId, driverId }).populate(
//     "vechile"
//   );
//   if (!ride) throw new Error("Ride not found or not owned by this driver");

//   const validateLocation = (loc, fieldName) => {
//     if (!loc) return; // skip if not provided
//     if (!loc.name) throw new Error(`${fieldName} must have a name`);
//     if (!loc.location || !Array.isArray(loc.location.coordinates)) {
//       throw new Error(`${fieldName} must have coordinates [lng, lat]`);
//     }
//     if (loc.location.coordinates.length !== 2) {
//       throw new Error(`${fieldName} coordinates must have exactly [lng, lat]`);
//     }
//   };

//   // Merge + validate origin
//   if (updateData.origin) {
//     ride.origin = {
//       ...ride.origin?.toObject(),
//       ...updateData.origin,
//     };
//     validateLocation(ride.origin, "Origin");
//   }

//   // Merge + validate destination
//   if (updateData.destination) {
//     ride.destination = {
//       ...ride.destination?.toObject(),
//       ...updateData.destination,
//     };
//     validateLocation(ride.destination, "Destination");
//   }

//   // Merge + validate stops
//   if (updateData.stops) {
//     if (!Array.isArray(updateData.stops)) {
//       throw new Error("Stops must be an array");
//     }
//     ride.stops = updateData.stops.map((stop, idx) => {
//       const mergedStop = {
//         ...ride.stops?.[idx]?.toObject(),
//         ...stop,
//       };
//       validateLocation(mergedStop, `Stop ${idx + 1}`);
//       return mergedStop;
//     });
//   }

//   // Update other ride fields
//   const allowedRideFields = ["dateTime", "availableSeats", "pricePerSeat"];
//   allowedRideFields.forEach((field) => {
//     if (updateData[field] !== undefined) {
//       ride[field] = updateData[field];
//     }
//   });

//   // Vehicle update logic
//   if (updateData.vechile && typeof updateData.vechile === "string") {
//     const existingVehicle = await Vechile.findOne({
//       _id: updateData.vechile,
//       owner: driverId,
//     });
//     if (!existingVehicle)
//       throw new Error("Vehicle not found or not owned by this driver");
//     ride.vechile = existingVehicle._id;
//   }

//   if (updateData.vechileInfo) {
//     if (ride.vechile) {
//       Object.assign(ride.vechile, updateData.vechileInfo);
//       await ride.vechile.save();
//     } else {
//       const newVehicle = new Vechile({
//         owner: driverId,
//         ...updateData.vechileInfo,
//       });
//       await newVehicle.save();
//       ride.vechile = newVehicle._id;
//     }
//   }

//   await ride.save();
//   return { message: "Ride and vehicle updated successfully", ride };
// };

exports.getRidesByDriver = async (driverId) => {
  return await Ride.find({ driverId })
    .populate("vechile")
    .sort({ dateTime: -1 }); // latest first
};

// exports.getBookingsByUser = async (userId) => {
//   return await Booking.find({ userId })
//     .populate({
//       path: "rideId",
//       populate: { path: "vehicle driverId" } // populate ride details
//     })
//     .sort({ createdAt: -1 }); // latest first
// };


exports.searchRides = async (searchParams) => {
  // Try to get from cache first
  console.log("Search params received from the frontend/controller",searchParams)
  const cacheKey = CacheService.generateSearchKey(searchParams);
  const cached = await CacheService.get(cacheKey);
  console.log("Cached Key is ",cached)
  console.log("cached result is :",cached)
  if (cached) {
    console.log('Returning cached search results');
    console.log(cached)
    return cached;
  }

  const {
    page,
    limit,
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
    timeWindow = 2, // hours
    routeDeviation = 10000, // meters
    enRouteMatching = true,
  } = searchParams;

  let originIds = [];
  let destinationIds = [];
  let hasLocationSearch = false;

  // STEP 1 — Enhanced Origin Search
  if (from) {
    hasLocationSearch = true;
    
    const originNameMatches = await Ride.find({
      $or: [
        { "origin.name": { $regex: from, $options: "i" } },
        { "destination.name": { $regex: from, $options: "i" } },
        { "stops.name": { $regex: from, $options: "i" } },
        { "searchKeywords": { $regex: from, $options: "i" } }
      ]
    }).select("_id");
    originIds = originNameMatches.map((r) => r._id.toString());

    console.log("origin names found are :",originNameMatches)
    console.log("originIds found are :",originIds)
    
    // If en-route matching is enabled, also search for rides passing through the area
    if (enRouteMatching && originIds.length === 0) {
      const geo = await geocodeWithRouteSnapping(from);
      if (geo) {

        console.log("The Geo Found are :",geo)
        // Split the geo queries into separate operations to avoid "Too many geoNear expressions" error
          const nearOriginQueries = [
            Ride.find({
              "origin.location": {
                $near: {
                  $geometry: { type: "Point", coordinates: [geo.lng, geo.lat] },
                  $maxDistance: parseInt(maxDistance),
                },
              },
            }).select("_id"),
            Ride.find({
              "destination.location": {
                $near: {
                  $geometry: { type: "Point", coordinates: [geo.lng, geo.lat] },
                  $maxDistance: parseInt(maxDistance),
                },
              },
            }).select("_id"),
            Ride.find({
              "stops.location": {
                $near: {
                  $geometry: { type: "Point", coordinates: [geo.lng, geo.lat] },
                  $maxDistance: parseInt(maxDistance),
                },
              },
            }).select("_id"),
            Ride.find({
              "routeBoundingBox": {
                $geoIntersects: {
                  $geometry: { type: "Point", coordinates: [geo.lng, geo.lat] }
                }
              }
            }).select("_id")
          ];
          
          console.log("Origin Near Queries are",nearOriginQueries)
          const nearOriginResults = await Promise.all(nearOriginQueries);
          const allNearOriginIds = nearOriginResults.flatMap(results => 
            results.map((r) => r._id.toString())
          );

        console.log("All near Origin Ids Found are ",allNearOriginIds)
        // Remove duplicates
        originIds = [...new Set(allNearOriginIds)];
        console.log("Resultant Ids found are :",originIds)
      }
    }
  } else if (lat && lng) {
    console.log("Entered the Origin Lat and Lng");
    
    hasLocationSearch = true;
    // Split the geo queries for coordinates search as well
    const originGeoQueries = [
      Ride.find({
        "origin.location": {
          $near: {
            $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
            $maxDistance: parseInt(maxDistance),
          },
        },
      }).select("_id"),
      Ride.find({
        "routeBoundingBox": {
          $geoIntersects: {
            $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] }
          }
        }
      }).select("_id")
    ];


    console.log("Origin Ids found are :",originIds)
    
    const originGeoResults = await Promise.all(originGeoQueries);
    const allOriginGeoIds = originGeoResults.flatMap(results => 
      results.map((r) => r._id.toString())
    );
    originIds = [...new Set(allOriginGeoIds)];
  }

  // STEP 2 — Enhanced Destination Search
  if (to) {
    hasLocationSearch = true;
    
    const destNameMatches = await Ride.find({
      $or: [
        { "origin.name": { $regex: to, $options: "i" } },
        { "destination.name": { $regex: to, $options: "i" } },
        { "stops.name": { $regex: to, $options: "i" } },
        { "searchKeywords": { $regex: to, $options: "i" } }
      ]
    }).select("_id");
    destinationIds = destNameMatches.map((r) => r._id.toString());

    console.log("destiName Matches Found are ",destNameMatches)
    console.log("Destination Ids Found are :",destinationIds)
    
    if (enRouteMatching && destinationIds.length === 0) {
      const geo = await geocodeWithRouteSnapping(to);
      if (geo) {

        console.log("Geo Destination Location From Frontend is ",geo)
        // Split the geo queries for destination search as well
        const nearDestQueries = [
          Ride.find({
            "origin.location": {
              $near: {
                $geometry: { type: "Point", coordinates: [geo.lng, geo.lat] },
                $maxDistance: parseInt(destMaxDistance),
              },
            },
          }).select("_id"),
          Ride.find({
            "destination.location": {
              $near: {
                $geometry: { type: "Point", coordinates: [geo.lng, geo.lat] },
                $maxDistance: parseInt(destMaxDistance),
              },
            },
          }).select("_id"),
          Ride.find({
            "stops.location": {
              $near: {
                $geometry: { type: "Point", coordinates: [geo.lng, geo.lat] },
                $maxDistance: parseInt(destMaxDistance),
              },
            },
          }).select("_id"),
          Ride.find({
            "routeBoundingBox": {
              $geoIntersects: {
                $geometry: { type: "Point", coordinates: [geo.lng, geo.lat] }
              }
            }
          }).select("_id")
        ];
        
        const nearDestResults = await Promise.all(nearDestQueries);
        const allNearDestIds = nearDestResults.flatMap(results => 
          results.map((r) => r._id.toString())
        );
        destinationIds = [...new Set(allNearDestIds)];

        console.log("Near Destination Results are ",nearDestResults)
        console.log("Near Destination Ids Found are ",destinationIds)
      }
    }
  } else if (destLat && destLng) {

    console.log("ENtered the Dest Lat and Dest Lng")
    hasLocationSearch = true;
    // Split the geo queries for destination coordinates search as well
    const destGeoQueries = [
      Ride.find({
        "origin.location": {
          $near: {
            $geometry: { type: "Point", coordinates: [parseFloat(destLng), parseFloat(destLat)] },
            $maxDistance: parseInt(destMaxDistance),
          },
        },
      }).select("_id"),
      Ride.find({
        "routeBoundingBox": {
          $geoIntersects: {
            $geometry: { type: "Point", coordinates: [parseFloat(destLng), parseFloat(destLat)] }
          }
        }
      }).select("_id")
    ];
    
    const destGeoResults = await Promise.all(destGeoQueries);
    const allDestGeoIds = destGeoResults.flatMap(results => 
      results.map((r) => r._id.toString())
    );
    destinationIds = [...new Set(allDestGeoIds)];
  }


  console.log("origin Ids",originIds)
  console.log("Destination Ids",destinationIds)
  // STEP 3 — Combine Results
  let finalIds = [];
  if (originIds.length && destinationIds.length) {
    const originSet = new Set(originIds);
    finalIds = destinationIds.filter((id) => originSet.has(id));
  } else if (originIds.length) {
    finalIds = originIds;
  } else if (destinationIds.length) {
    finalIds = destinationIds;
  } else if (hasLocationSearch) {
    return [];
  }


  console.log("finals Ids are ",finalIds)
  // STEP 4 — Build Query
  let query = {};
  if (finalIds.length > 0) {
    query._id = { $in: finalIds };
  } else if (hasLocationSearch) {
    return [];
  }

  let rideWithEmpty = await Ride.find(query)
  .populate("vechile")
  .populate("driverId", "name email phone rating totalTrips verificationStatus");

  console.log("Ride Details after applying Date filter",rideWithEmpty)


  // Enhanced Date Filter with Time Window
  if (date) {
    const searchDate = new Date(date);
    const start = new Date(searchDate);
    start.setUTCHours(0 , 0, 0, 0);
    
    const end = new Date(searchDate);
    end.setUTCHours(23, 59, 59, 999);
    
    query.dateTime= { $gte: start, $lte: end };
  }

  let rideDate = await Ride.find(query)
  .populate("vechile")
  .populate("driverId", "name email phone rating totalTrips verificationStatus");

  console.log("Ride Details after applying Date filter",rideDate)

  // Other filters
  if (passengers) {
    query.availableSeats = { $gte: parseInt(passengers) };
  }

  let ride = await Ride.find(query)
    .populate("vechile")
    .populate("driverId", "name email phone rating totalTrips verificationStatus");

    console.log("Pre Rides Before Prices Constraints results ",ride)

  // if (maxPrice !== undefined && maxPrice !== null && maxPrice !== "") {
  //   const p = parseFloat(maxPrice);
  //   if (!Number.isNaN(p)) {
  //     query.pricePerSeat = { ...(query.pricePerSeat || {}), $lte: p };
  //   }
  // }

  // Fetch rides with enhanced population
  let rides = await Ride.find(query)
    .populate("vechile")
    .populate("driverId", "name email phone rating totalTrips verificationStatus");


    console.log("resultant rides after applying the Prices Constraints ",rides)

 

  let paginatedRides = rides;
  if(page && limit){
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const start = (page-1) * limitNum;
    const end = start + limitNum;
    paginatedRides = rides.slice(start,end);


    console.log("The start and end ",start,end)
    console.log("The paginated Results ",paginatedRides.length  )

    return {
      rides:paginatedRides,
      pagination:{
        totalResults : rides.length,
        currentPage:pageNum,
        pageSize:limitNum
      }
    };
  }

  // Cache the results for 5 minutes
  await CacheService.set(cacheKey, rides, 300);
  // console.log("The paginated results are ",page,limit)
  console.log(rides)
  return rides;
};