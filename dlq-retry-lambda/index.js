import {
	DeleteMessageBatchCommand,
	ReceiveMessageCommand,
	SendMessageBatchCommand,
	SQSClient,
} from "@aws-sdk/client-sqs";
import { randomUUID } from "node:crypto";

const client = new SQSClient({});
const batchSize = 10;

function requiredEnvironment(name) {
	const value = process.env[name];

	if (!value) {
		throw new Error(`${name} must be configured`);
	}

	return value;
}

function maxMessagesPerInvocation() {
  const value = Number.parseInt(process.env.MAX_MESSAGES_PER_INVOCATION || "10", 10);

	if (!Number.isInteger(value) || value < 1) {
		throw new Error("MAX_MESSAGES_PER_INVOCATION must be a positive integer");
	}

	return value;
}

function sendEntry(message, index, isFifoQueue) {
	const entry = {
		Id: `send-${index}`,
		MessageBody: message.Body || "",
		MessageAttributes: message.MessageAttributes,
	};

	if (isFifoQueue) {
		entry.MessageGroupId = message.Attributes?.MessageGroupId || "dlq-retry";
		entry.MessageDeduplicationId = randomUUID();
	}

	return entry;
}

function deleteEntry(message, index) {
	return {
		Id: `delete-${index}`,
		ReceiptHandle: message.ReceiptHandle,
	};
}

export const handler = async () => {
	const dlqUrl = requiredEnvironment("DLQ_URL");
	const mainQueueUrl = requiredEnvironment("MAIN_QUEUE_URL");
	const maxMessages = maxMessagesPerInvocation();
	const isFifoQueue = mainQueueUrl.endsWith(".fifo");

	const result = {
		received: 0,
		retried: 0,
		retained: 0,
		deleteFailures: 0,
	};

	while (result.received < maxMessages) {
		const receiveResult = await client.send(
			new ReceiveMessageCommand({
				QueueUrl: dlqUrl,
				MaxNumberOfMessages: Math.min(batchSize, maxMessages - result.received),
				WaitTimeSeconds: 0,
				AttributeNames: ["All"],
				MessageAttributeNames: ["All"],
			}),
		);
		const messages = receiveResult.Messages || [];

		if (messages.length === 0) {
			break;
		}

		result.received += messages.length;

		const sendResult = await client.send(
			new SendMessageBatchCommand({
				QueueUrl: mainQueueUrl,
				Entries: messages.map((message, index) =>
					sendEntry(message, index, isFifoQueue),
				),
			}),
		);
		const successfulSendIds = new Set(
			(sendResult.Successful || []).map((entry) => entry.Id),
		);
		const messagesToDelete = messages.filter((_, index) =>
			successfulSendIds.has(`send-${index}`),
		);

		result.retried += messagesToDelete.length;
		result.retained += messages.length - messagesToDelete.length;

		if (messagesToDelete.length === 0) {
			console.error("Unable to send DLQ messages to the main queue", sendResult.Failed);
			break;
		}

		const deleteResult = await client.send(
			new DeleteMessageBatchCommand({
				QueueUrl: dlqUrl,
				Entries: messagesToDelete.map(deleteEntry),
			}),
		);

		result.deleteFailures += (deleteResult.Failed || []).length;

		if ((sendResult.Failed || []).length > 0) {
			console.error("Some DLQ messages were retained", sendResult.Failed);
			break;
		}
	}

	console.log("DLQ retry completed", result);
	return result;
};
