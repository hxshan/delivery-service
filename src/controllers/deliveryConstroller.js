import delivery from "../models/delivery";
import delivery from "../models/delivery";
import {v4 as uuid} from 'uuid'

const addDelivery = async (req, res) =>{
    const {userId,OrderId} = req.body;
    try{

        if(!userId || OrderId){
            res.status(404).json({message:"User Id and Order Id are both required"})
        }
        const delivery = new delivery({
            deliveryId:uuid(),
            userId:userId,
            OrderId:OrderId,
            Status:"Pending"
        })
        await delivery.save();
        res.status(201).json({message:"Delivery Created"})
    }catch(error){
        console.log(error)
        res.status(404).json({message:"SERVER ERROR!"})
    }
}

const changeStatus = async (req, res) =>{
    const {id} = req.params;
    const {status} = req.body;
    try{
        if(!id){
            res.status(404).json({message:"Id is required"})
        }
        const delivery = await delivery.findOne({deliveryId:id}).exec()
        if(!delivery){
            res.status(404).json({message:"Delivery is not found"})
        }
        delivery.status = status || 'Cancelled';
        await delivery.save();

        res.status(200).json({message:"Delivery Status updated"})
    }catch(error){
        console.log(error)
        res.status(404).json({message:"SERVER ERROR!"})
    }

}

const assignDriver = async (req, res) =>{
    const {id} = req.params;
    const {driverId} = req.body;
    try{
        if(!id){
            res.status(404).json({message:"Id is required"})
        }
        const delivery = await delivery.findOne({deliveryId:id}).exec()
        if(!delivery){
            res.status(404).json({message:"Delivery is not found"})
        }
        delivery.driverId = driverId;
        await delivery.save();

        res.status(200).json({message:"Delivery driver added"})
    }catch(error){
        console.log(error)
        res.status(404).json({message:"SERVER ERROR!"})
    }

}


export default {
    addDelivery,
    changeStatus,
    assignDriver
  };