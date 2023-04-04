import { APIGatewayProxyEvent } from "aws-lambda";
import { PrismaClient } from "@prisma/client";
import * as AWS from "aws-sdk";

const prisma = new PrismaClient();

type payloadType = {
  senderID: string;
  channelID: number;
  message: string;
};

export async function handler(event: APIGatewayProxyEvent) {
  let payload: payloadType = JSON.parse(event.body);
  const senderID = payload.senderID;
  const channelID = payload.channelID;

  const message = payload.message;
  const comment = await prisma.comment.create({
    data: {
      message: message,
      channelID: channelID,
      userId: senderID,
    },
  });

  const connections = await prisma.wSConnection.findMany({
    where: {
      channelID: channelID,
    },
  });
  const client = new AWS.ApiGatewayManagementApi({
    endpoint: `https://${event.requestContext.domainName}/${event.requestContext.stage}`,
  });
  if (connections.length > 0) {
    await Promise.all(
      connections.map(async (connection) => {
        try {
          const output = {
            ConnectionId: connection.connectionID,
            Data: JSON.stringify(comment),
          };
          await client.postToConnection(output).promise();
        } catch (e) {
          if (e.statusCode === 410) {
            // If a connection is no longer available, delete it from the database.
            await prisma.wSConnection.delete({
              where: { connectionID: connection.connectionID },
            });
          } else {
            console.error(
              `Failed to send message to connection ${connection.connectionID}: ${e}`
            );
            throw e;
          }
        }
      })
    );
  }
}
