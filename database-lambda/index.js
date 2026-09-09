import fs from "fs";
import mysql from "mysql2/promise";

let pool;

function getPool() {
  if (!pool) {
    const ssl =
      process.env.sslmode && fs.existsSync("./ca-certificate.crt")
        ? {
            ca: fs.readFileSync("./ca-certificate.crt"),
          }
        : process.env.sslmode
          ? {}
          : undefined;

    pool = mysql.createPool({
      host: process.env.host,
      user: process.env.username,
      password: process.env.password,
      database: process.env.database,
      port: Number.parseInt(process.env.port || "3306", 10),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl,
    });
  }

  return pool;
}

async function upsertCoordinates(points) {
  const values = points.map((point) => [point.x, point.y, point.color]);

  await getPool().query(
    `INSERT INTO coordinates (x, y, color)
     VALUES ?
     ON DUPLICATE KEY UPDATE
       color = VALUES(color),
       updated_at = CURRENT_TIMESTAMP;`,
    [values],
  );

  return values.length;
}

async function deleteCoordinates(points) {
  const keys = points.map((point) => [point.x, point.y]);
  const placeholders = keys.map(() => "(?, ?)").join(", ");
  const values = keys.flat();

  const [result] = await getPool().query(
    `DELETE FROM coordinates WHERE (x, y) IN (${placeholders})`,
    values,
  );

  return result.affectedRows;
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

function parseBody(body) {
  if (body == null || body === "") {
    return {};
  }

  return typeof body === "string" ? JSON.parse(body) : body;
}

async function handleHttpEvent(event) {
  const method =
    event.requestContext?.http?.method || event.httpMethod || event.method;

  if (method === "GET") {
    return jsonResponse(405, {
      error: "GET is not supported by this lambda",
    });
  }

  if (method === "POST" || method === "PUT") {
    const body = parseBody(event.body);
    const points = body.data;

    if (!Array.isArray(points) || points.length === 0) {
      return jsonResponse(400, { error: "No data" });
    }

    const count = await upsertCoordinates(points);
    return jsonResponse(200, { success: true, count });
  }

  if (method === "DELETE") {
    const body = parseBody(event.body);
    const points = body.data;

    if (!Array.isArray(points) || points.length === 0) {
      return jsonResponse(400, { error: "No data" });
    }

    const count = await deleteCoordinates(points);
    return jsonResponse(200, { success: true, count });
  }

  return jsonResponse(405, { error: "Method not allowed" });
}

function toQueuedRequest(message) {
  const payload = parseBody(message);

  return {
    method: payload.method,
    body: payload.body,
  };
}

function emitInvocationMetrics({
  invocationType,
  received,
  processed,
  failed,
  durationMs,
}) {
  console.log(
    JSON.stringify({
      _aws: {
        Timestamp: Date.now(),
        CloudWatchMetrics: [
          {
            Namespace: "DrawingBoard/DatabaseLambda",
            Dimensions: [["InvocationType"]],
            Metrics: [
              { Name: "Invocations", Unit: "Count" },
              { Name: "RecordsReceived", Unit: "Count" },
              { Name: "RecordsProcessed", Unit: "Count" },
              { Name: "RecordsFailed", Unit: "Count" },
              { Name: "InvocationDuration", Unit: "Milliseconds" },
            ],
          },
        ],
      },
      InvocationType: invocationType,
      Invocations: 1,
      RecordsReceived: received,
      RecordsProcessed: processed,
      RecordsFailed: failed,
      InvocationDuration: durationMs,
    }),
  );
}

export const handler = async (event) => {
  const startedAt = Date.now();
  const isSqsEvent = Array.isArray(event.Records) && event.Records.length > 0;
  const received = isSqsEvent ? event.Records.length : 1;
  let processed = 0;
  let failed = 0;

  try {
    if (isSqsEvent) {
      const batchItemFailures = [];

      await Promise.all(
        event.Records.map(async (record) => {
          try {
            const result = await handleHttpEvent(toQueuedRequest(record.body));

            if (result.statusCode >= 400) {
              throw new Error(`Message handler returned ${result.statusCode}`);
            }
          } catch (error) {
            console.error(`Unable to process SQS message ${record.messageId}`, error);
            batchItemFailures.push({ itemIdentifier: record.messageId });
          }
        }),
      );

      failed = batchItemFailures.length;
      processed = received - failed;
      return { batchItemFailures };
    }

    const result = await handleHttpEvent(event);
    processed = result.statusCode < 400 ? 1 : 0;
    failed = result.statusCode >= 400 ? 1 : 0;
    return result;
  } catch (error) {
    console.error(error);
    failed = received;

    if (isSqsEvent) {
      throw error;
    }

    return jsonResponse(500, { error: "Database error" });
  } finally {
    emitInvocationMetrics({
      invocationType: isSqsEvent ? "SQS" : "Direct",
      received,
      processed,
      failed,
      durationMs: Date.now() - startedAt,
    });
  }
};
