import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import dotenv from "dotenv";

dotenv.config();

let client;

export class QueueEnqueueError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "QueueEnqueueError";
    this.cause = cause;
  }
}

function getClient() {
  if (!client) {
    const config = {
      region: process.env.AWS_REGION || process.env.aws_region || "us-west-2",
    };

    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      config.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      };
    }

    client = new SQSClient(config);
  }

  return client;
}

export async function enqueueCoordinateRequest(method, data) {
  if (!process.env.QUEUE_URL) {
    throw new QueueEnqueueError("QUEUE_URL must be configured");
  }

  const command = new SendMessageCommand({
    QueueUrl: process.env.QUEUE_URL,
    MessageBody: JSON.stringify({
      method,
      body: {
        data,
      },
    }),
  });

  try {
    return await getClient().send(command);
  } catch (error) {
    throw new QueueEnqueueError("Failed to enqueue coordinate request", error);
  }
}
