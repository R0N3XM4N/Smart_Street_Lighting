import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI?.trim() || "mongodb://127.0.0.1:27017";
const MONGODB_DB = process.env.MONGODB_DB?.trim() || "streetlight_ops";

const client = new MongoClient(MONGODB_URI);
try {
  await client.connect();
  const database = client.db(MONGODB_DB);
  const events = database.collection("streetlight_events");
  try {
    await events.dropIndex("event_search");
  } catch (error) {
    if (!["IndexNotFound", "NamespaceNotFound"].includes(error.codeName)) throw error;
  }
  await Promise.all([
    events.createIndex({ createdAt: -1 }, { name: "createdAt_desc" }),
    events.createIndex({ action: 1, createdAt: -1 }, { name: "action_createdAt" }),
    events.createIndex({ actorId: 1, createdAt: -1 }, { name: "actor_createdAt" }),
    events.createIndex(
      {
        actor: "text", action: "text", entityType: "text", entityId: "text",
        "details.poleCode": "text", "details.zone": "text", "details.name": "text", "details.location": "text",
      },
      { name: "event_search" },
    ),
  ]);
  console.log(`MongoDB indexes are ready: ${MONGODB_DB}.streetlight_events.`);
} finally {
  await client.close();
}
