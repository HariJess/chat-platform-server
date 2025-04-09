import { Request, Response, NextFunction } from "express";
import { getRooms } from "../services/rooms";
import { createRoom } from "../services/rooms";

export async function getRoomsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userID = req.query.userID as string;
    const my_email = req.query.my_email as string;

    if (!userID || !my_email) {
      res.status(400).json({
        error: "Missing query parameters: userID and my_email are required.",
      });
      return;
    }

    const rooms = await getRooms(userID, my_email);
    console.log("La récupération des Rooms a reussi :", rooms);

    res.status(201).json(rooms);
  } catch (error) {
    console.error("Erreur lors de la récupération des rooms :", error);
    next(error);
    res.status(500).json({ error: "Erreur interne" });
  }
}

export async function createRoomHandler(req: Request, res: Response) {
  try {
    const formData = req.body;
    const result = await createRoom(formData);
    res.status(201).json({
      success: true,
      message: "Room created successfully",
      roomId: (result as any).insertId, // selon la structure du résultat
    });
  } catch (error) {
    console.error("Erreur lors de la création de la room :", error);
    res.status(500).json({ error: "Erreur interne" });
  }
}
