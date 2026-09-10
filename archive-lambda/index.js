import { FilterLogEventsCommand, CloudWatchLogsClient } from "@aws-sdk/client-cloudwatch-logs";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createReadStream } from "node:fs";
import { writeFile } from "node:fs/promises";

const cloudWatchLogs = new CloudWatchLogsClient({});
const s3 = new S3Client({});
const dayInMilliseconds = 24 * 60 * 60 * 1000;
const archiveMinimumAgeDays = 15;
const archiveMaximumAgeDays = 30;

function requiredEnvironment(name) {
	const value = process.env[name];

	if (!value) {
		throw new Error(`${name} must be configured`);
	}

	return value;
}

function archiveKey(prefix, archivedAt) {
	const normalizedPrefix = prefix.replace(/^\/+|\/+$/g, "");
	const date = archivedAt.toISOString().slice(0, 10);
	const filename = `database-lambda-logs-${archivedAt.toISOString().replaceAll(":", "-")}.ndjson`;

	return normalizedPrefix ? `${normalizedPrefix}/${date}/${filename}` : `${date}/${filename}`;
}

async function findArchiveableLogEvents(logGroupName, startTime, endTime) {
	const records = [];
	let nextToken;

	do {
		const response = await cloudWatchLogs.send(
      new FilterLogEventsCommand({
        logGroupName,
        startTime,
        endTime,
				nextToken,
			}),
		);

		for (const event of response.events || []) {
			records.push({
				eventId: event.eventId,
				logStreamName: event.logStreamName,
				timestamp: event.timestamp,
				ingestionTime: event.ingestionTime,
				message: event.message,
			});
		}

		nextToken = response.nextToken;
	} while (nextToken);

	return records;
}

export const handler = async () => {
	const logGroupName = requiredEnvironment("SOURCE_LOG_GROUP_NAME");
  const bucket = requiredEnvironment("ARCHIVE_BUCKET");
  const prefix = process.env.ARCHIVE_PREFIX || "cloudwatch-logs";
  const archivedAt = new Date();
  const archiveWindowStart =
    archivedAt.getTime() - archiveMaximumAgeDays * dayInMilliseconds + 1;
  const archiveWindowEnd =
    archivedAt.getTime() - archiveMinimumAgeDays * dayInMilliseconds;
  const records = await findArchiveableLogEvents(
    logGroupName,
    archiveWindowStart,
    archiveWindowEnd,
  );

  if (records.length === 0) {
    console.log("No CloudWatch log events found in the archive window", {
      logGroupName,
      minimumAgeDays: archiveMinimumAgeDays,
      maximumAgeDays: archiveMaximumAgeDays,
    });
		return { archived: 0 };
	}

	const key = archiveKey(prefix, archivedAt);
	const filePath = `/tmp/${key.split("/").at(-1)}`;
	const fileContents = `${records.map((record) => JSON.stringify(record)).join("\n")}\n`;

	await writeFile(filePath, fileContents, "utf8");
	await s3.send(
		new PutObjectCommand({
			Bucket: bucket,
			Key: key,
			Body: createReadStream(filePath),
			ContentType: "application/x-ndjson",
		}),
	);

	console.log("Archived CloudWatch log events", {
		bucket,
		key,
    logGroupName,
    records: records.length,
    minimumAgeDays: archiveMinimumAgeDays,
    maximumAgeDays: archiveMaximumAgeDays,
  });

	return { archived: records.length, bucket, key };
};
