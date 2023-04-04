import { APIGatewayProxyEvent } from "aws-lambda";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const connect = async (event: APIGatewayProxyEvent) => {
  const connectionId = event.requestContext.connectionId;
  await prisma.wSConnection.create({
    data: {
      connectionID: connectionId,
    },
  });
  return { statusCode: 200, body: JSON.stringify({ connectionId }) };
};
