import mysql from "mysql2/promise";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const pool = mysql.createPool({
  host: process.env.host,
  user: process.env.username,
  password: process.env.password,
  database: process.env.database,
  port: parseInt(process.env.port),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    ca: fs.readFileSync("./ca-certificate.crt"),
  },
});

export default pool;
