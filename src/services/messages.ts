import pool from "../db";
import path from "path";
import fs from "fs";
import multer from "multer";

interface MessageData {
  roomID: string;
  userID: string;
  type: string;
  timeStamp: string;
  content?: string;
  fileMessage?: Express.Multer.File;
}

// Dossier de destination pour les fichiers messages
const uploadsMessageDir = path.join(process.cwd(), "public/uploads/message");
if (!fs.existsSync(uploadsMessageDir)) {
  fs.mkdirSync(uploadsMessageDir, { recursive: true });
}

export async function getMessages(roomID: string) {
  const query = `SELECT *
                FROM CHAT_MESSAGES
                WHERE RoomID = ?`;
  const [rows] = await pool.query(query, roomID);
  return rows;
}

export async function getAllMessages() {
  const query = `SELECT *
                FROM CHAT_MESSAGES`;
  const [rows] = await pool.query(query);
  return rows;
}

export async function sendMessages(message: MessageData) {
  const { roomID, content, userID, type, timeStamp, fileMessage } = message;

  let query = `INSERT INTO CHAT_MESSAGES (RoomID, SenderID, content, type, Timestamp)
      VALUES (?, ?, ?, ?, ?)`;
  let params: any[];

  if (!fileMessage) {
    // Aucun fichier, on utilise le contenu texte
    params = [roomID, userID, content, type, timeStamp];
  } else {
    const FileUniqueName = `${roomID}-${fileMessage.originalname}`;
    const FilePath = path.join(uploadsMessageDir, FileUniqueName);
    // Écrire le buffer du fichier dans le dossier de destination
    const FileBuffer = fileMessage.buffer;
    fs.writeFileSync(FilePath, FileBuffer);
    const FileMessage = `uploads/message/${FileUniqueName}`;
    params = [roomID, userID, FileMessage, type, timeStamp];
  }

  const [result] = await pool.query(query, params);
  return result;
}

export async function deleteMessages(roomID: string): Promise<void> {
  const query = `DELETE
                FROM CHAT_MESSAGES
                WHERE RoomID = ?`;
  const query_1 = `DELETE
                FROM CHAT_MEMBERS 
                WHERE RoomID = ?`;
  const query_2 = `DELETE
                FROM CHAT_ROOMS 
                WHERE RoomID = ?`;
  await pool.query(query, [roomID]);
  await pool.query(query_1, [roomID]);
  await pool.query(query_2, [roomID]);
}
