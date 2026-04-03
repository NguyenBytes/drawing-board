import pool from "../db.js";

export async function getCoordinates(x, y) {
  let query = "SELECT * FROM coordinates";
  const range = [x, x + 100, y, y + 100];

  if (x != null || y != null) {
    query += " WHERE x >= ? AND x < ? AND y >= ? AND y < ?";
  }

  const [rows] = await pool.execute(query + ";", range);
  return rows;
}

export async function upsertCoordinates(points) {
  const values = points.map((p) => [p.x, p.y, p.color]);
  await pool.query(
    `INSERT INTO coordinates (x, y, color)
     VALUES ?
     ON DUPLICATE KEY UPDATE
       color = VALUES(color),
       updated_at = CURRENT_TIMESTAMP;`,
    [values],
  );
  return values.length;
}

export async function deleteCoordinates(points) {
  const keys = points.map((p) => [p.x, p.y]);
  const placeholders = keys.map(() => "(?, ?)").join(", ");
  const values = keys.flat();

  const [result] = await pool.query(
    `DELETE FROM coordinates WHERE (x, y) IN (${placeholders})`,
    values,
  );
  return result.affectedRows;
}
