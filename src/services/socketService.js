import jwt from "jsonwebtoken";
import { Server } from "socket.io";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;

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

  // io.use((socket, next) => {
  //   const token = socket.handshake.auth.token;
  //   if (!token) return next(new Error("Authentication error"));

  //   try {
  //     const payload = jwt.verify(token, ACCESS_TOKEN_SECRET);
  //     socket.user = payload;
  //     return next();
  //   } catch (err) {
  //     return next(new Error("Invalid token"));
  //   }
  // });
  io.on("connection", (socket) => {
    console.log(`New client connected: ${socket.id}`);
  
    const { id, role } = socket.user;
    console.log(`${role} connected: ${id}`);
    
    switch (role) {
      case "customer":
        connectedCustomers.set(id, socket.id);
        break;
      case "driver":
        connectedDrivers.set(id, socket.id);
        break;
      case "restaurant":
        connectedRestaurants.set(id, socket.id);
        break;
      default:
        console.log(`Unknown role: ${role}`);
    }
  
    socket.on("join_order", (orderId) => {
      socket.join(`order_${orderId}`);
      console.log(`${role} joined order ${orderId}`);
    });
  
    socket.on("update_location", ({ orderId, location }) => {
      if (role !== "driver") return;
  
      io.to(`order_${orderId}`).emit("driver_location_update", {
        driverId: id,
        location
      });
    });
  
    socket.on("delivery_completed", ({ orderId }) => {
      if (role !== "driver") return;
  
      io.to(`order_${orderId}`).emit("delivery_done", {
        orderId,
        driverId: id
      });
  
      socket.leave(`order_${orderId}`);
    });
  
    socket.on("disconnect", () => {
      console.log(`${role} disconnected: ${id}`);
    
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


//   io.on("connection", (socket) => {
//     const { id, role } = socket.user;
//     console.log(`${role} connected: ${id}`);

//     socket.on("join_order", (orderId) => {
//       socket.join(`order_${orderId}`);
//       console.log(`${role} joined order ${orderId}`);
//     });

//     socket.on("update_location", ({ orderId, location }) => {
//       if (role !== "driver") return;

//       // Broadcast to customer in the order room
//       io.to(`order_${orderId}`).emit("driver_location_update", {
//         driverId: id,
//         location
//       });
//     });

//     socket.on("delivery_completed", ({ orderId }) => {
//       if (role !== "driver") return;

//       // Notify restaurant (via backend trigger or event)
//       io.to(`order_${orderId}`).emit("delivery_done", {
//         orderId,
//         driverId: id
//       });

//       // Optionally: remove users from the room
//       socket.leave(`order_${orderId}`);
//     });

//     socket.on("disconnect", () => {
//       console.log(`${role} disconnected: ${id}`);
//     });
//   });
// };

const socketService = {
  initSocketServer,
  getIO: () => io
};

export default socketService;