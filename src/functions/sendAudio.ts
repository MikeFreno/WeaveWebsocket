import { APIGatewayProxyEvent } from "aws-lambda";
import { PrismaClient } from "@prisma/client";
import * as AWS from "aws-sdk";

const prisma = new PrismaClient();

type payloadType = {
  senderID: string;
  channelID: number;
  audio?: Uint8Array;
};

export async function handler(event: APIGatewayProxyEvent) {
  try {
    let payload: payloadType = JSON.parse(event.body);
    const audio = payload.audio;
    const senderConnection = event.requestContext.connectionId;

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

    await Promise.all(
      connections.map(async (connection) => {
        if (connection.connectionID !== senderConnection) {
          try {
            const output = {
              ConnectionId: connection.connectionID,
              Data: JSON.stringify({
                audio: audio,
                speaker: sender_connection.userId,
              }),
            };
            await client.postToConnection(output).promise();
            return { statusCode: 200, body: "Audio sent." };
          } catch (e) {
            if (e.statusCode === 410) {
              // If a connection is no longer available, delete it from the database.
              await prisma.wSConnection.delete({
                where: { connectionID: connection.connectionID },
              });
            } else {
              console.error(
                `Failed to send audio to connection ${connection.connectionID}: ${e}`
              );
              throw e;
            }
          }
        } else {
          return {
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Methods": "*",
              "Access-Control-Allow-Origin": "*",
            },
            statusCode: 200,
            body: "Audio sent.",
          };
        }
      })
    );

    return {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Allow-Origin": "*",
      },
      statusCode: 200,
      body: "Audio sent.",
    };
  } catch (e) {
    console.error(`An error occurred: ${e}`);
    return {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Allow-Origin": "*",
      },
      statusCode: 500,
      body: "Internal Server Error",
    };
  }
}
