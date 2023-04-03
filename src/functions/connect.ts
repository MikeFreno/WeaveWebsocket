import { APIGatewayProxyEvent } from "aws-lambda";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type payload = {
  message: string;
  senderID: string;
  channelID: string;
};

export const connect = async (event: APIGatewayProxyEvent) => {
  let payload: payload;
  const connectionId = event.requestContext.connectionId;
  if (event.body) {
    payload = JSON.parse(event.body);
    const senderID = payload.senderID;
    const channelID = parseInt(payload.channelID);
    await prisma.wSConnection.create({
      data: {
        connectionID: connectionId,
        channelID: channelID,
        userId: senderID,
      },
    });
  } else {
    await prisma.wSConnection.create({
      data: {
        connectionID: connectionId,
      },
    });
  }
  return { statusCode: 200, body: JSON.stringify({ connectionId }) };
};
