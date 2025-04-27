import http from "http";
import dotenv from "dotenv";
import express from "express";
import socketService from "./services/socketService.js";  // Note the .js extension
const { initSocketServer } = socketService;


dotenv.config();
const app = express(); 

const server = http.createServer(app);
initSocketServer(server);

server.listen(process.env.PORT || 5005, () => {
  console.log("Server running...");
});
