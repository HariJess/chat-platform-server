import { Request, Response, NextFunction } from "express";
import { getMessages } from "../services/messages";
import { sendMessages } from "../services/messages";
import { deleteMessages } from "../services/messages";

export async function getMessagesHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const roomID = req.query.id as string;

    if (!roomID) {
      res.status(400).json({
        error: "Missing query parameters: roomID are required.",
      });
      return;
    }

    const messages = await getMessages(roomID);
    console.log("La récupération des messages a reussi :", messages);

    res.status(201).json(messages);
  } catch (error) {
    console.error("Erreur lors de la récupération des messages :", error);
    next(error);
    res.status(500).json({ error: "Erreur interne" });
  }
}

export async function deleteMessagesHandler(req: Request, res: Response) {
  try {
    const roomID = req.body.roomID as string;

    if (!roomID) {
      res.status(400).json({
        error: "Missing query parameters: roomID are required.",
      });
      return;
    }

    await deleteMessages(roomID);
    console.log("Chat room deleted successfully :", roomID);

    res.status(201).json({
      success: true,
      message: "Chat room deleted successfully",
      roomID,
    });
  } catch (error) {
    console.error("Erreur lors de l'operation!", error);
    res.status(500).json({ error: "Erreur interne" });
  }
}

export async function sendMessagesHandler(req: Request, res: Response) {
  try {
    const formData = {
      roomID: req.body.roomID,
      content: req.body.content,
      userID: req.body.userID,
      type: req.body.type,
      timeStamp: req.body.timeStamp,
      fileMessage: req.file, // Ici, req.file est de type Express.Multer.File
    };
    // const formData = req.body;
    const result = await sendMessages(formData);
    // const result = await sendMessages(formData);
    res.status(201).json({
      success: true,
      message: "Message send successfully",
      roomId: (result as any).insertId, // selon la structure du résultat
    });
  } catch (error) {
    console.error("Erreur lors de l'envoi du message :", error);
    res.status(500).json({ error: "Erreur interne" });
  }
}
