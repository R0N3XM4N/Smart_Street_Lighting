import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";

const required = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME", "INITIAL_USERNAME", "INITIAL_PASSWORD", "INITIAL_ROLE"];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`Missing environment variables: ${missing.join(", ")}`);
  process.exit(1);
}
if (!["viewer", "operator"].includes(process.env.INITIAL_ROLE)) {
  console.error("INITIAL_ROLE must be viewer or operator.");
  process.exit(1);
}
if (process.env.INITIAL_PASSWORD.length < 12) {
  console.error("INITIAL_PASSWORD must be at least 12 characters.");
  process.exit(1);
}

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? "3306"),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});
try {
  const hash = await bcrypt.hash(process.env.INITIAL_PASSWORD, 12);
  await connection.execute(
    "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
    [process.env.INITIAL_USERNAME, hash, process.env.INITIAL_ROLE],
  );
  console.log(`Created ${process.env.INITIAL_ROLE} account "${process.env.INITIAL_USERNAME}".`);
} finally {
  await connection.end();
}
