import jwt from "jsonwebtoken";
import { Server } from "socket.io";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'qiwuegquwe123123bahsbd213123asdhuaisdguashd';

let io;

const connectedCustomers = new Map();
const connectedDrivers = new Map();
const connectedRestuarants = new Map();

const initSocketServer = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*", // You can lock this down later
      methods: ["GET", "POST"]
    }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication error"));

    try {
      // console.log(token);
      console.log(ACCESS_TOKEN_SECRET);
      const payload = jwt.verify(token, ACCESS_TOKEN_SECRET);
      socket.user = payload;
      return next();
    } catch (err) {
      console.log(err);
      return next(new Error("Invalid token"));
    }
  });
  io.on("connection", (socket) => {
    console.log(`New client connected: ${socket.id}`);
  
    const { userId, role } = socket.user;
    console.log(`${role} connected: ${userId}`);

    switch (role) {
      case "customer":
        connectedCustomers.set(userId, socket.id);
        break;
      case "driver":
        connectedDrivers.set(userId, socket.id);
        break;
      case "restaurant":
        connectedRestaurants.set(userId, socket.id);
        break;
      default:
        console.log(`Unknown role: ${role}`);
    }
    socket.on("user_connected", (userData) => {
      console.log(`Received user details for ${userData.userType} ${userData.userId}`);
      
      // Store additional user details based on user type
      switch (userData.userType) {
        case "customer":
          connectedCustomers.set(userData.userId, {
            socketId: socket.id,
            name: userData.name||'guest',
            lastActive: new Date(),
          });
          break;
        case "driver":
          connectedDrivers.set(userData.userId, {
            socketId: socket.id,
            name: userData.name||'guest',
            lastActive: new Date(),
            isAvailable: true, 
            location: null,
          });
          break;
        case "restaurant":
          connectedRestaurants.set(userData.userId, {
            socketId: socket.id,
            name: userData.name||'guest',
            lastActive: new Date(),
          });
          break;
      }
    });
  
 
  
    socket.on("disconnect", () => {
      console.log(`${role} disconnected: ${userId}`);
    
      switch (role) {
        case "customer":
          connectedCustomers.delete(id);
          break;
        case "driver":
          connectedDrivers.delete(id);
          break;
        case "restaurant":
          connectedRestaurants.delete(id);
          break;
      }
    });
  });
}  



const socketService = {
  initSocketServer,
  getIO: () => io
};

export default socketService;