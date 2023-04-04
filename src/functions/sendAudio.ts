import { APIGatewayProxyEvent } from "aws-lambda";
import { PrismaClient } from "@prisma/client";
import * as AWS from "aws-sdk";

const prisma = new PrismaClient();

type payloadType = {
  senderID: string;
  channelID: number;
  requestType: string;
  data?: string | object;
  targetConnectionID?: string;
};

export async function handler(event: APIGatewayProxyEvent) {
  let payload: payloadType = JSON.parse(event.body);
  const senderConnection = event.requestContext.connectionId;
  const requestType = payload.requestType;

  const sender_connection = await prisma.wSConnection.findFirst({
    where: {
      connectionID: senderConnection,
    },
  });

  const connections = await prisma.wSConnection.findMany({
    where: {
      channelID: sender_connection.channelID,
      inCall: true,
    },
  });
  const client = new AWS.ApiGatewayManagementApi({
    endpoint: `https://${event.requestContext.domainName}/${event.requestContext.stage}`,
  });

  switch (requestType) {
    case "peer":
      // Broadcast the new peer's ID to all other clients
      await Promise.all(
        connections.map(async (connection) => {
          const message = { type: "peer", id: connection.connectionID };
          const output = {
            ConnectionId: connection.connectionID,
            Data: JSON.stringify(message),
          };

          await client.postToConnection(output).promise();
        })
      );
      break;
    case "signal":
      // Forward the signal to the target client
      const targetSocket = payload.targetConnectionID;
      if (targetSocket) {
        const message = {
          type: "signal",
          from: senderConnection,
          signal: payload.data,
        };
        const output = {
          ConnectionId: targetSocket,
          Data: JSON.stringify(message),
        };
        await client.postToConnection(output).promise();
      }
      break;
    default:
      console.error("Unknown message type:", payload.requestType);
  }
}
