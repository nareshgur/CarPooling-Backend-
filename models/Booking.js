Booking {
  _id
  rideId
  passengerId
  pickupPoint: coordinates
  dropPoint: coordinates
  seatsBooked
  status: Pending | Confirmed | Cancelled
}
