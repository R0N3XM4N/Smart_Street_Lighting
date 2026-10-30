export const DEFAULT_MONGODB_URI = "mongodb://127.0.0.1:27017";
export const DEFAULT_MONGODB_DB = "streetlight_ops";

export function resolveMongoConfig(environment: Record<string, string | undefined> = process.env) {
  const uri = environment.MONGODB_URI?.trim() || DEFAULT_MONGODB_URI;
  const database = environment.MONGODB_DB?.trim() || DEFAULT_MONGODB_DB;
  return {
    uri,
    database,
    usingLocalDefault: !environment.MONGODB_URI?.trim(),
  };
}
