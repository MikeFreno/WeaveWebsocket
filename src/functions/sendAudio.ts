import { APIGatewayProxyEvent } from "aws-lambda";
import { PrismaClient } from "@prisma/client";
import * as AWS from "aws-sdk";

const prisma = new PrismaClient();

type payloadType = {
  senderID: string;
  channelID: number;
  type: string;
  data?: string | object;
  targetConnectionID?: string;
  candidate?: any;
  offer?: any;
  answer?: any;
};

export async function handler(event: APIGatewayProxyEvent) {
  let payload: payloadType = JSON.parse(event.body);
  const senderConnection = event.requestContext.connectionId;
  const requestType = payload.type;

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
    apiVersion: "2018-11-29",
    endpoint: "jzph5ltl27.execute-api.us-east-1.amazonaws.com/dev",
  });

  switch (requestType) {
    case "ice-candidate":
      // Broadcast the new peer's ID to all other clients
      if (connections.length > 1) {
        await Promise.all(
          connections
            .filter(
              (connection) => connection.connectionID !== senderConnection
            )
            .map(async (connection) => {
              const output = {
                ConnectionId: connection.connectionID,
                Data: JSON.stringify({
                  type: "ice-candidate",
                  candidate: payload.candidate,
                }),
              };
              await client.postToConnection(output).promise();
            })
        );
      }
      break;
    case "offer":
      if (connections.length > 1) {
        await Promise.all(
          connections
            .filter(
              (connection) => connection.connectionID !== senderConnection
            )
            .map(async (connection) => {
              const output = {
                ConnectionId: connection.connectionID,
                Data: JSON.stringify({
                  type: "offer",
                  offer: payload.offer,
                }),
              };
              await client.postToConnection(output).promise();
            })
        );
      }
      break;
    case "answer":
      if (connections.length > 1) {
        await Promise.all(
          connections
            .filter(
              (connection) => connection.connectionID !== senderConnection
            )
            .map(async (connection) => {
              const output = {
                ConnectionId: connection.connectionID,
                Data: JSON.stringify({
                  type: "answer",
                  answer: payload.answer,
                }),
              };
              await client.postToConnection(output).promise();
            })
        );
      }
      break;
    case "leave":
      await Promise.all(
        connections
          .filter((connection) => connection.connectionID !== senderConnection)
          .map(async (connection) => {
            const output = {
              ConnectionId: connection.connectionID,
              Data: JSON.stringify({
                type: "leave",
              }),
            };
            await client.postToConnection(output).promise();
          })
      );
    default:
      console.error("Unknown message type:", payload.type);
  }
}
