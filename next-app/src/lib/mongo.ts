import "server-only";
import { MongoClient, type Collection, type Db } from "mongodb";
import { resolveMongoConfig } from "@/lib/mongo-config";

export type AuditEvent = {
  actorId: number;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown>;
  createdAt: Date;
};

export type MongoAvailability =
  | { status: "available"; message: string }
  | { status: "not_configured"; message: string }
  | { status: "unavailable"; message: string };

let client: MongoClient | undefined;
let db: Db | undefined;
let collection: Collection<AuditEvent> | undefined;
let connectPromise: Promise<Collection<AuditEvent>> | undefined;

export async function getAuditCollection(): Promise<Collection<AuditEvent>> {
  if (collection) return collection;
  if (!connectPromise) {
    const config = resolveMongoConfig();
    connectPromise = (async () => {
      client = new MongoClient(config.uri, {
        serverSelectionTimeoutMS: 4000,
      });
      await client.connect();
      db = client.db(config.database);
      const events = db.collection<AuditEvent>("streetlight_events");
      await Promise.all([
        events.createIndex({ createdAt: -1 }, { name: "createdAt_desc" }),
        events.createIndex({ action: 1, createdAt: -1 }, { name: "action_createdAt" }),
        events.createIndex({ actorId: 1, createdAt: -1 }, { name: "actor_createdAt" }),
        events.createIndex(
          {
            actor: "text", action: "text", entityType: "text", entityId: "text",
            "details.poleCode": "text", "details.zone": "text",
            "details.name": "text", "details.location": "text",
          },
          { name: "event_search" },
        ),
      ]);
      collection = events;
      return events;
    })().catch((error: unknown) => {
      connectPromise = undefined;
      client = undefined;
      db = undefined;
      const message = error instanceof Error ? error.message : "MongoDB connection failed";
      throw new Error(`MongoDB connection failed: ${message}`);
    });
  }
  return connectPromise;
}

export async function mongoAvailability(): Promise<MongoAvailability> {
  try {
    await getAuditCollection();
    const config = resolveMongoConfig();
    return {
      status: "available",
      message: config.usingLocalDefault
        ? `Connected to local MongoDB at 127.0.0.1:27017/${config.database}.`
        : `Connected to configured MongoDB database "${config.database}".`,
    };
  } catch (error) {
    const config = resolveMongoConfig();
    console.error("MongoDB connection unavailable:", error);
    return {
      status: "unavailable",
      message: `MongoDB event store is unavailable. ${
        config.usingLocalDefault
          ? "The local default MongoDB endpoint 127.0.0.1:27017 was attempted."
          : `The configured MongoDB database "${config.database}" was attempted.`
      }`,
    };
  }
}

export async function recordAuditEvent(event: AuditEvent): Promise<MongoAvailability> {
  try {
    const events = await getAuditCollection();
    await events.insertOne(event);
    return { status: "available", message: "Audit event persisted." };
  } catch (error) {
    const status = await mongoAvailability();
    console.error("Could not persist MongoDB audit event:", error);
    return { status: "unavailable", message: status.message };
  }
}

export async function searchAuditEvents(search: string) {
  const events = await getAuditCollection();
  const filter = search ? { $text: { $search: search } } : {};
  const [results] = await events.aggregate([
    { $match: filter },
    {
      $facet: {
        recent: [
          { $sort: { createdAt: -1 } },
          { $limit: 30 },
          { $project: { _id: 0, actorId: 1, actor: 1, action: 1, entityType: 1, entityId: 1, details: 1, createdAt: 1 } },
        ],
        byAction: [
          { $group: { _id: "$action", count: { $sum: 1 } } },
          { $sort: { count: -1, _id: 1 } },
          { $limit: 8 },
        ],
        byHour: [
          { $group: { _id: { $dateTrunc: { date: "$createdAt", unit: "hour" } }, count: { $sum: 1 } } },
          { $sort: { _id: -1 } },
          { $limit: 12 },
        ],
      },
    },
  ]).toArray();
  return results ?? { recent: [], byAction: [], byHour: [] };
}

export async function closeMongoConnection(): Promise<void> {
  await client?.close();
  client = undefined;
  db = undefined;
  collection = undefined;
  connectPromise = undefined;
}
