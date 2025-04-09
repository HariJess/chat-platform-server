import pool from "../db";

export async function getMembers(roomID: string) {
  const query = `
    SELECT *
    FROM CHAT_MEMBERS
    WHERE RoomID = ?;
  `;
  const [rows] = await pool.query(query, [roomID]);
  return rows;
}
