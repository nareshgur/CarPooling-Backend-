// controllers/bookingController.js
const Booking = require("../models/Booking");
const Notification = require("../models/Notification");

exports.createBooking = async ({rideId,driverId,passengerId}) => {
  const booking = await Booking.create({ rideId, driverId, passengerId });

    const notification = await Notification.create({
      recipientId: driverId,
      senderId: passengerId,
      type: "booking_request",
      title: "New Ride Request",
      message: "You have a new ride request.",
      data: { bookingId: booking._id, rideId, passengerId },
    });
    console.log('The booking service is called ',notification)

    global.socketService.sendToUser(driverId, "notification", notification);

    return booking;
};

exports.approveBooking = async (bookingId, driverId) => {
  console.log(`🚀 Approving booking ${bookingId} by driver ${driverId}`);
  
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new Error("Booking not found");

  console.log(`📋 Found booking:`, {
    id: booking._id,
    passengerId: booking.passengerId,
    status: booking.status
  });

  booking.status = "Approved";
  booking.approvedAt = new Date();
  await booking.save();

  console.log(`✅ Booking status updated to Approved`);

  const notification = await Notification.create({
    recipientId: booking.passengerId,
    senderId: driverId,
    type: "booking_approved",
    title: "Booking Approved",
    message: "Your ride request has been approved!",
    data: { bookingId: booking._id, rideId: booking.rideId },
  });

  console.log(`📝 Notification created:`, {
    id: notification._id,
    recipientId: notification.recipientId,
    type: notification.type
  });

  console.log(`🔔 Sending notification to passenger ${booking.passengerId}`);
  global.socketService.sendToUser(booking.passengerId, "notification", notification);

  return booking;
};

exports.rejectBooking = async (bookingId,driverId) => {
  console.log("The booking received on the service side is ",bookingId,driverId)
  const booking = await Booking.findById(bookingId);
  console.log("The booking record found is ",booking)
    if (!booking) throw new Error("Booking not found");

    booking.status = "Rejected";
    await booking.save();

    const notification = await Notification.create({
      recipientId: booking.passengerId,
      senderId: driverId,
      type: "booking_rejected",
      title: "Booking Rejected",
      message: "Your ride request was rejected.",
      data: { bookingId: booking._id, rideId: booking.rideId },
    });

    global.socketService.sendToUser(booking.passengerId, "notification", notification);

    return booking;
};
