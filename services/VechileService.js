const Vechile = require("../models/Vechile");

exports.createVechile = async (ownerId, vechileData) => {
  const vechile = new Vechile({
    owner: ownerId,
    ...vechileData
  });
  await vechile.save();
  return vechile;
};

exports.updateVechile = async (ownerId, vechileId, updateData) => {
  const vechile = await Vechile.findOne({ _id: vechileId, owner: ownerId });
  if (!vechile) {
    throw new Error("Vehicle not found or not owned by user");
  }
  Object.assign(vechile, updateData);
  await vechile.save();
  return vechile;
};

exports.getMyVechiles = async (ownerId) => {
  return await Vechile.find({ owner: ownerId });
};

exports.deleteVechile = async (ownerId, vechileId) => {
  const vechile = await Vechile.findOneAndDelete({ _id: vechileId, owner: ownerId });
  if (!vechile) {
    throw new Error("Vehicle not found or not owned by user");
  }
  return { message: "Vehicle deleted successfully" };
};
