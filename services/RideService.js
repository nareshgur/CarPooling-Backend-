const Ride = require("../models/Ride");

exports.createRide = async (driverId, rideData) => {
  const ride = new Ride({
    ...rideData,
    driver: driverId,
  });

  await ride.save();
  return ride;
};
