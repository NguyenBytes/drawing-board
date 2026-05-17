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

export const handler = async (event) => {
  const isSqsEvent = Array.isArray(event.Records) && event.Records.length > 0;

  try {
    if (isSqsEvent) {
      const results = await Promise.all(
        event.Records.map(async (record) => {
          const result = await handleHttpEvent(toQueuedRequest(record.body));

          return {
            messageId: record.messageId,
            statusCode: result.statusCode,
          };
        }),
      );

      return {
        processed: results.length,
        results,
      };
    }

    return await handleHttpEvent(event);
  } catch (error) {
    console.error(error);

    if (isSqsEvent) {
      throw error;
    }

    return jsonResponse(500, { error: "Database error" });
  }
};
