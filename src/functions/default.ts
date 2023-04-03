import { APIGatewayProxyEvent } from "aws-lambda";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type payloadType = {
  senderID: string;
  channelID: number;
};

export async function handler(event: APIGatewayProxyEvent) {
  try {
    let payload: payloadType = JSON.parse(event.body);
    const senderID = payload.senderID;
    const channelID = payload.channelID;

    const connectionId = event.requestContext.connectionId;
    await prisma.wSConnection.update({
      where: {
        connectionID: connectionId,
      },
      data: {
        channelID: channelID,
        userId: senderID,
      },
    });
    return { statusCode: 200, body: "Connection updated." };
  } catch (e) {
    console.error(`An error occurred: ${e}`);
    return { statusCode: 500, body: "Internal Server Error" };
  }
}
