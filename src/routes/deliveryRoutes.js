import express from "express"
import deliveryController from "../controllers/deliveryConstroller.js";


const router = express.Router();
  
router.post('/',deliveryController.addDelivery)
router.put('/:id',deliveryController.changeStatus)
router.put('/:id/driver',deliveryController.assignDriver)


export default router;