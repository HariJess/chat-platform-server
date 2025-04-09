import pool from "../db";

interface RoomData {
  RoomId: string;
  name: string;
  chatType: string | null;
  idSender?: string;
  email?: string;
  id?: string;
  email_Receiver?: string;
  // Pour un groupe, on attend également :
  groupMembers?: string; // chaîne JSON contenant le tableau des membres
}

export async function getRooms(userID: string, my_email: string) {
  const query = `
  SELECT 
    CR.RoomID,
    CASE 
      WHEN CR.IsGroup IS NULL THEN (
        SELECT CM2.userID 
        FROM CHAT_MEMBERS AS CM2
        WHERE CM2.RoomID = CR.RoomID 
          AND CM2.email <> ?
        LIMIT 1
      )
      ELSE CR.RoomName
    END AS RoomName,
    CR.IsGroup,
    (SELECT COUNT(*) FROM CHAT_MEMBERS WHERE RoomID = CR.RoomID) AS memberCount
  FROM CHAT_ROOMS AS CR
  JOIN CHAT_MEMBERS AS CM ON CR.RoomID = CM.RoomID
  WHERE CM.userID = ?;
`;
  const [rows] = await pool.query(query, [my_email, userID]);
  return rows;
}

export async function createRoom(roomData: RoomData): Promise<any> {
  const {
    RoomId,
    name,
    chatType,
    idSender,
    email,
    id,
    email_Receiver,
    groupMembers,
  } = roomData;

  const insertRoomSql =
    "INSERT INTO CHAT_ROOMS (RoomID, RoomName, isGroup) VALUES (?, ?, ?)";
  const params = [RoomId, name, chatType];
  // CHAT ROOMS REQUEST
  const [result] = await pool.query(insertRoomSql, params);

  // CHAT MEMBERS REQUEST
  if (!chatType) {
    const chatMembers = [
      {
        userId: id,
        roomId: RoomId,
        email: email_Receiver,
      },
      {
        userId: idSender,
        roomId: RoomId,
        email: email,
      },
    ];
    console.log("chat member (individuel):", chatMembers);

    // INDIVIDUAL CHAT
    const insertMemberSql =
      "INSERT INTO CHAT_MEMBERS (userID, RoomID, email) VALUES (?, ?, ?)";
    for (const member of chatMembers) {
      await pool.query(insertMemberSql, [
        member.userId,
        member.roomId,
        member.email,
      ]);
    }
  } else if (chatType === "true") {
    // Cas d'un chat de groupe (Code 1)
    if (!groupMembers) {
      throw new Error("Missing groupMembers");
    }
    let parsedGroupMembers;
    try {
      parsedGroupMembers = JSON.parse(groupMembers);
    } catch (e) {
      throw new Error("Invalid groupMembers JSON");
    }

    // Ajout du créateur s'il n'est pas déjà présent
    const creatorMember = {
      userId: idSender,
      roomId: RoomId,
      email: email,
    };

    const isCreatorIncluded = parsedGroupMembers.some(
      (member: any) => member.userId === idSender
    );

    if (!isCreatorIncluded) {
      parsedGroupMembers.push(creatorMember);
    }

    console.log("chat member (groupe):", parsedGroupMembers);

    const insertMemberSql =
      "INSERT INTO CHAT_MEMBERS (userID, RoomID, email) VALUES (?, ?, ?)";
    for (const member of parsedGroupMembers) {
      await pool.query(insertMemberSql, [
        member.userId,
        member.roomId,
        member.email,
      ]);
    }
  }
  return result;
}
