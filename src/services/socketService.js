import jwt from "jsonwebtoken";
import { Server } from "socket.io";

const ACCESS_TOKEN_SECRET =
  process.env.ACCESS_TOKEN_SECRET ||
  "qiwuegquwe123123bahsbd213123asdhuaisdguashd";

let io;

//userid:socketid
const connectedCustomers = new Map();
const connectedDrivers = new Map();
const connectedRestaurants = new Map();

const orderStatus = new Map(); // orderId: { status, message, timestamp }

// Store delivery state: orderId -> { customerId, driverId, phase, restaurantLocation, customerLocation }
const activeDeliveries = new Map();

const initSocketServer = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",

      methods: ["GET", "POST"],
    },
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
    const { userId, role } = socket.user;

    switch (role) {
      case "customer":
        connectedCustomers.set(userId, socket.id);
        break;
      case "restaurant":
        connectedRestaurants.set(userId, socket.id);
        break;
      case "driver":
        connectedDrivers.set(userId, socket.id);
        break;
    }

    socket.on("restaurant:order-update", ({ orderId, status, message }) => {
      if (role !== "restaurant") return;

      const order = getOrderDetails(orderId);

      if (!order) {
        console.log(`Order ${orderId} not found`);
        return;
      }

      orderStatus.set(orderId, { status, message, timestamp: new Date() });

      // Notify the customer
      const customerSocketId = connectedCustomers.get(order.customerId);
      if (customerSocketId) {
        io.to(customerSocketId).emit("customer:order-update", {
          orderId,
          status,
          message,
          timestamp: new Date(),
        });
      }
    });

    //customer requesting thsi
    socket.on("customer:get-order-status", (orderId) => {
      if (role !== "customer") return;

      const status = orderStatus.get(orderId);
      if (status) {
        socket.emit("customer:order-update", {
          orderId,
          ...status,
        });
      }
    });

    socket.on("restaurant:order-ready", (orderData) => {
      if (role !== "restaurant") return;

      console.log(`Order ready for pickup: ${orderData.orderId}`);

      // Notify all connected drivers (no distance filtering)
      connectedDrivers.forEach((driverSocketId, driverId) => {
        io.to(driverSocketId).emit("driver:new-delivery", {
          orderId: orderData.orderId,
          restaurantId: userId,
          restaurantName: orderData.restaurantName,
          restaurantAddress: orderData.restaurantAddress,
          readyTime: new Date(),
          estimatedPrepTime: orderData.estimatedPrepTime,
          items: orderData.items,
        });
        console.log(
          `Notified driver ${driverId} about order ${orderData.orderId}`
        );
      });
    });

    socket.on(
      "driver:accept-order",
      ({ orderId, restaurantLocation, customerLocation }) => {
        if (role !== "driver") return;

        activeDeliveries.set(orderId, {
          driverId: userId,
          customerId: getCustomerIdForOrder(orderId),
          restaurantId: getRestaurantIdForOrder(orderId),
          phase: "going_to_restaurant", // Initial phase
          restaurantLocation, // { lat, lng }
          customerLocation, // { lat, lng }
          lastLocation: null,
        });

        // Notify customer
        const customerSocketId = connectedCustomers.get(
          getCustomerIdForOrder(orderId)
        );
        if (customerSocketId) {
          io.to(customerSocketId).emit("customer:delivery-update", {
            orderId,
            status: "driver_assigned",
            phase: "going_to_restaurant",
            driverId: userId,
            driverLocation: null, // No location yet
          });
        }

        // Notify restaurant
        const restaurantSocketId = connectedRestaurants.get(
          getRestaurantIdForOrder(orderId)
        );
        if (restaurantSocketId) {
          io.to(restaurantSocketId).emit("restaurant:driver-assigned", {
            orderId,
            driverId: userId,
          });
        }
      }
    );
    // Handle driver location updates
    socket.on("driver:location-update", (location) => {
      if (role !== "driver") return;

      // Find all active deliveries for this driver
      const driverOrders = [];
      activeDeliveries.forEach((details, orderId) => {
        if (details.driverId === userId) {
          driverOrders.push({ orderId, details });
        }
      });

      // Process each active delivery
      driverOrders.forEach(({ orderId, details }) => {
        // Update last known location
        details.lastLocation = location;
        activeDeliveries.set(orderId, details);

        // Determine target location based on phase
        const targetLocation =
          details.phase === "going_to_restaurant"
            ? details.restaurantLocation
            : details.customerLocation;

        // Calculate distance to target
        const distanceToTarget = calculateDistance(location, targetLocation);

        // Notify customer
        const customerSocketId = connectedCustomers.get(details.customerId);
        if (customerSocketId) {
          io.to(customerSocketId).emit("customer:delivery-update", {
            orderId,
            status: "en_route",
            phase: details.phase,
            driverLocation: location,
            targetLocation,
            distanceToTarget,
            eta: calculateETA(distanceToTarget),
          });
        }

        // Check if reached restaurant
        if (
          details.phase === "going_to_restaurant" &&
          distanceToTarget < 0.02
        ) {
          // ~100 meters
          details.phase = "at_restaurant";
          activeDeliveries.set(orderId, details);

          io.to(customerSocketId).emit("customer:delivery-update", {
            orderId,
            status: "arrived_at_restaurant",
            phase: "at_restaurant",
          });
        }

        // Check if reached customer (only if in this phase)
        if (details.phase === "going_to_customer" && distanceToTarget < 0.02) {
          details.phase = "delivered";
          activeDeliveries.set(orderId, details);

          io.to(customerSocketId).emit("customer:delivery-update", {
            orderId,
            status: "arrived_at_location",
            phase: "delivered",
          });
        }
      });
    });
    // Handle driver picking up order
    socket.on("driver:order-picked-up", ({ orderId }) => {
      if (role !== "driver") return;

      const delivery = activeDeliveries.get(orderId);
      if (!delivery || delivery.driverId !== userId) return;

      // Change phase to going to customer
      delivery.phase = "going_to_customer";
      activeDeliveries.set(orderId, delivery);

      // Notify customer
      const customerSocketId = connectedCustomers.get(delivery.customerId);
      if (customerSocketId) {
        io.to(customerSocketId).emit("customer:delivery-update", {
          orderId,
          status: "order_picked_up",
          phase: "going_to_customer",
          driverLocation: delivery.lastLocation,
          targetLocation: delivery.customerLocation,
        });
      }
    });

    // Handle driver location updates
    socket.on("driver:location-update", (location) => {
      if (role !== "driver") return;

      // Find all orders this driver is currently delivering
      const driverOrders = [];
      activeDeliveries.forEach((details, orderId) => {
        if (details.driverId === userId) {
          driverOrders.push(orderId);
        }
      });

      // Notify each customer
      driverOrders.forEach((orderId) => {
        const orderDetails = activeDeliveries.get(orderId);
        const customerSocketId = connectedCustomers.get(
          orderDetails.customerId
        );

        if (customerSocketId) {
          io.to(customerSocketId).emit("customer:driver-location", {
            orderId,
            location: {
              lat: location.lat,
              lng: location.lng,
              heading: location.heading,
              speed: location.speed,
            },
            timestamp: new Date(),
          });
        }
      });
    });

    socket.on("disconnect", () => {
      // Remove from connected users
      switch (role) {
        case "customer":
          connectedCustomers.delete(userId);
          break;
        case "restaurant":
          connectedRestaurants.delete(userId);
          break;
        case "driver":
          connectedDrivers.delete(userId);
          break;
      }
      console.log(`${role} disconnected: ${userId}`);
    });
  });
};

const socketService = {
  initSocketServer,
  getIO: () => io,
};

export default socketService;
