import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import http from "http";
import express from "express";
import socketService from "./services/socketService.js";  // Note the .js extension
const { initSocketServer } = socketService;
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, '../.env')
});
console.log(process.env.ACCESS_TOKEN_SECRET);
const app = express(); 

const server = http.createServer(app);
initSocketServer(server);

server.listen(process.env.PORT || 5006, () => {
  console.log("Server running...");
});
