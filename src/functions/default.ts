import { APIGatewayProxyEvent } from "aws-lambda";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type payloadType = {
  senderID: string;
  channelID?: number;
  updateType: string;
};

export async function handler(event: APIGatewayProxyEvent) {
  let payload: payloadType = JSON.parse(event.body);
  const updateType = payload.updateType;
  const senderID = payload.senderID;
  const connectionId = event.requestContext.connectionId;

  switch (updateType) {
    case "channel":
      const channelID = payload.channelID;

      await prisma.wSConnection.update({
        where: {
          connectionID: connectionId,
        },
        data: {
          channelID: channelID,
          userId: senderID,
        },
      });
      break;
    case "user":
      await prisma.wSConnection.update({
        where: {
          connectionID: connectionId,
        },
        data: {
          userId: senderID,
        },
      });
  }
  return { statusCode: 200, body: "Connection updated." };
}
