import {
  getCoordinates,
  upsertCoordinates,
  deleteCoordinates,
} from "../models/coordinate.js";

export async function index(req, res) {
  const x = parseInt(req.query.x);
  const y = parseInt(req.query.y);
  try {
    const rows = await getCoordinates(
      req.query.x != null ? x : null,
      req.query.y != null ? y : null,
    );
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
}

export async function update(req, res) {
  const points = req.body.data;
  if (!Array.isArray(points) || points.length === 0) {
    return res.status(400).json({ error: "No data" });
  }
  try {
    const count = await upsertCoordinates(points);
    res.json({ success: true, count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
}

export async function remove(req, res) {
  const points = req.body.data;
  if (!Array.isArray(points) || points.length === 0) {
    return res.status(400).json({ error: "No data" });
  }
  try {
    const count = await deleteCoordinates(points);
    res.json({ success: true, count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
}
