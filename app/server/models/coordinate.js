import pool from "../db.js";
import { enqueueCoordinateRequest } from "../sqs.js";

export async function getCoordinates(x, y) {
  let query = "SELECT * FROM coordinates";
  const range = [x, x + 100, y, y + 100];

  if (x != null || y != null) {
    query += " WHERE x >= ? AND x < ? AND y >= ? AND y < ?";
  }

  const [rows] = await pool.execute(query + ";", range);
  return rows;
}

export async function upsertCoordinates(points, method = "POST") {
  await enqueueCoordinateRequest(method, points);
  return {
    queued: true,
    count: points.length,
  };
}

export async function deleteCoordinates(points) {
  await enqueueCoordinateRequest("DELETE", points);
  return {
    queued: true,
    count: points.length,
  };
}
