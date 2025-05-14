import mongoose from "mongoose";
const deliverySchema = new mongoose.Schema({
    deliveryId: {
      type: String,
      required: true,
      unique: true,
    },
    customerId: {
      type: String,
      required: true,
      unique: true,
    },
    orderId: {
        type: String,
        required: true,
        unique: true,
    },
    driverId: {
        type: String,
        unique: true,
    },
    status:{
        type: String,
        required: true,
    }
  });
  
 export default mongoose.model('Delivery', deliverySchema);