const { string } = require("joi");
const {Ride} = require("../models/Ride");
const Vechile = require('../models/Vechile');
const { VechileType } = require("../utils/enums");


exports.createRide = async (driverId, rideData) => {

  let vechileId = rideData.vechileId
  console.log("Driver Id",driverId)
  console.log("Ride Data",rideData)


  if(!vechileId && rideData){
    console.log('Entered the if block')
    const newVechile = new Vechile({
      owner: driverId,
      make:rideData.vechileInfo.make,
      model:rideData.vechileInfo.model,
      plateNumber:rideData.vechileInfo.plateNumber,
      VechileType:rideData.vechileInfo.VechileType
    })
    await newVechile.save()
    vechileId = newVechile._id
  }

  if(!vechileId) {
    throw new Error("Vechile Information is required to create a Ride")
  }

  const ride = new Ride({
    ...rideData,
    vechile:vechileId,
    driverId: driverId,
  });

  await ride.save();
  return ride;
};


exports.updateRideAndVehicle = async (driverId, rideId, updateData) => {
  // Find ride owned by the driver
  const ride = await Ride.findOne({ _id: rideId, driverId }).populate("vechile");
  if (!ride) {
    throw new Error("Ride not found or not owned by this driver");
  }

  /** ------------------------
   * Update Ride Details
   * ------------------------ */
  const allowedRideFields = [
    "origin",
    "destination",
    "dateTime",
    "availableSeats",
    "pricePerSeat",
    "stops"
  ];

  allowedRideFields.forEach(field => {
    if (updateData[field] !== undefined) {
      ride[field] = updateData[field];
    }
  });

  if(updateData.vechile && typeof updateData.vechile === "string"){
    const existingVechile = await Vechile.findOne({_id:updateData.vechile,owner:driverId})
    if(!existingVechile) throw new Error("Vechile not found or not owned by this driver")

      ride.vechile = updateData._id
  }

  /** ------------------------
   * Update Vehicle Details (if provided)
   * ------------------------ */
  console.log('Data provided for updating the record',updateData)
  if (updateData.vechileInfo) {
    if (ride.vechile) {
      Object.assign(ride.vechile, updateData.vechileInfo);
      await ride.vechile.save();
    } else {
      const newVechile = new Vechile({
        owner: driverId,
        ...updateData.vechileInfo
      });
      await newVechile.save();
      ride.vechile = newVechile._id;
    }
  }

  await ride.save();

  return { message: "Ride and vehicle updated successfully", ride };
};
