const auth = require("../middleware/auth");
const VechileService = require("../services/VechileService");
const express = require('express')
const router = express.Router()


router.post('/', auth,async (req, res) => {
  try {
    const vechile = await VechileService.createVechile(req.user._id, req.body);
    res.status(201).send(vechile);
  } catch (err) {
    console.error("Error creating vehicle", err);
    res.status(500).send({ error: err.message });
  }
});

router.put('/:vechileId',auth,async (req, res) => {
  try {
    const vechileId = req.params.vechileId;
    const updated = await VechileService.updateVechile(req.user._id, vechileId, req.body);
    res.status(200).send(updated);
  } catch (err) {
    console.error("Error updating vehicle", err);
    res.status(500).send({ error: err.message });
  }
});

router.get('/',auth,async (req, res) => {
  try {
    const vechiles = await VechileService.getMyVechiles(req.user._id);
    res.status(200).send(vechiles);
  } catch (err) {
    console.error("Error fetching vehicles", err);
    res.status(500).send({ error: err.message });
  }
});

router.delete('/:vechileId',auth,async (req, res) => {
  try {
    const deleted = await VechileService.deleteVechile(req.user._id, req.params.vechileId);
    res.status(200).send(deleted);
  } catch (err) {
    console.error("Error deleting vehicle", err);
    res.status(500).send({ error: err.message });
  }
});


module.exports = router