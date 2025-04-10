import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
// API ROUTER
import { getRoomsHandler } from "./routes/rooms";
import { createRoomHandler } from "./routes/rooms";
import { getMessagesHandler } from "./routes/messages";
import { getAllMessagesHandler } from "./routes/messages";
import { sendMessagesHandler } from "./routes/messages";
import { deleteMessagesHandler } from "./routes/messages";
import { getMembersHandler } from "./routes/members";

const app = express();
const upload = multer();
const httpServer = createServer(app);
dotenv.config();

// middleware
app.use(
  cors({
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true,
  })
);
// Middleware pour parser le JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Sert les fichiers statiques depuis /public
app.use(express.static("public"));

let rooms: { [key: string]: string[] } = {};
let messages: { [key: string]: any[] } = {};

// sockket.io SETUP
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// utilisateurs connectés
const onlineUsers: { [userId: string]: string[] } = {};
io.on("connection", (socket) => {
  console.log("Nouvelle connexion:", socket.id);

  // evenement REGISTER pour le client avec son userId
  socket.on("register", (data: { userId: string }) => {
    const { userId } = data;
    if (onlineUsers[userId]) {
      onlineUsers[userId].push(socket.id);
    } else {
      onlineUsers[userId] = [socket.id];
    }
    console.log(`User ${userId} est en ligne.`);
    io.emit("user_online", { userId, online: true });

    // Envoyer la liste complète des utilisateurs en ligne au nouvel utilisateur
    socket.emit(
      "online_users",
      Object.keys(onlineUsers).reduce((acc, userId) => {
        acc[userId] = true;
        return acc;
      }, {} as Record<string, boolean>)
    );
  });

  // room chat
  socket.on("join_chat_room", (data) => {
    const { roomId, idOfUser } = data; // On attend roomId et userId
    socket.join(roomId);
    console.log(`User ${idOfUser} joined room ${roomId}`);

    // Si la room n'existe pas, l'initialiser
    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }
    rooms[roomId].push(socket.id);

    // Initialiser l'historique des messages si nécessaire
    if (!messages[roomId]) {
      messages[roomId] = [];
    }

    // Envoyer l'historique des messages au nouvel utilisateur
    socket.emit("receive_message_history", {
      roomId: roomId,
      messages: messages[roomId],
    });

    io.to(roomId).emit("userJoined", `User ${idOfUser} joined room ${roomId}`);

    // Mettre à jour la liste des rooms pour tous les clients
    io.emit("rooms_update", Object.keys(rooms));
  });

  // send message
  socket.on("send_message", (data) => {
    console.log("Message reçu sur le serveur : ", data);
    const { roomId, ...messageData } = data;

    if (messages[roomId]) {
      messages[roomId].push(messageData); // Ajouter sans dupliquer la room ID
    } else {
      messages[roomId] = [messageData];
    }

    // Émettre à tous les utilisateurs de la room, y compris celui qui a envoyé
    io.to(roomId).emit("receive_message", messageData);
  });

  // Événement de déconnexion
  socket.on("disconnect", () => {
    // console.log("User disconnected", socket.id);
    // On retire l'utilisateur des rooms
    for (let room in rooms) {
      rooms[room] = rooms[room].filter((id) => id !== socket.id);
      if (rooms[room].length === 0) {
        delete rooms[room];
        delete messages[room];
      }
    }

    // suppression de onlineUsers
    for (const userId in onlineUsers) {
      onlineUsers[userId] = onlineUsers[userId].filter(
        (id) => id !== socket.id
      );
      if (onlineUsers[userId].length === 0) {
        delete onlineUsers[userId];
        console.log(`User ${userId} est hors ligne.`);
        io.emit("user_online", { userId, online: false });
      }
    }

    io.emit("rooms_update", Object.keys(rooms));
  });
});

// API URL
app.get("/api/chat/rooms", getRoomsHandler);
app.post("/api/chat/rooms/create", upload.none(), createRoomHandler);
app.get("/api/chat/rooms/members", getMembersHandler);
app.post(
  "/api/chat/messages/send",
  upload.single("fileMessage"),
  sendMessagesHandler
);
app.get("/api/chat/messages", getMessagesHandler);
app.get("/api/chat/messages/all", getAllMessagesHandler);
app.post("/api/chat/messages/delete", upload.none(), deleteMessagesHandler);

// demarrage du serveur
const PORT = process.env.PORT || 5500;
httpServer.listen(PORT, () => {
  console.log(`Serveur ok!\n Port: ${PORT}`);
});
