import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config();

const connection = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "Bangladesh71",
  database: process.env.DB_NAME || "Mobile_pos",
  port: Number(process.env.DB_PORT) || 3306,
});

connection.connect((err) => {
  if (err) {
    console.error("❌ MySQL connection error:", err.message);
  } else {
    console.log("✅ Connected to MySQL database!");
  }
});

export default connection;
