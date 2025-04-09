import { Request, Response, NextFunction } from "express";
import { getMembers } from "../services/members";

export async function getMembersHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const roomID = req.query.roomID as string;

    if (!roomID) {
      res.status(400).json({
        error: "Missing query parameters: roomID is required.",
      });
      return;
    }

    const members = await getMembers(roomID);
    console.log("La récupération des membres de la room a reussi :", members);

    res.status(201).json(members);
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des membres de la room :",
      error
    );
    next(error);
    res.status(500).json({ error: "Erreur interne" });
  }
}
