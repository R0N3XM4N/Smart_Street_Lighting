import { describe, expect, it } from "vitest";
import { resolveMongoConfig } from "./mongo-config";

describe("MongoDB configuration", () => {
  it("uses the documented local no-auth defaults when environment settings are absent", () => {
    expect(resolveMongoConfig({})).toEqual({
      uri: "mongodb://127.0.0.1:27017",
      database: "streetlight_ops",
      usingLocalDefault: true,
    });
  });

  it("honors configured URI and database overrides", () => {
    expect(resolveMongoConfig({
      MONGODB_URI: "mongodb://db.example:27017",
      MONGODB_DB: "city_lighting",
    })).toEqual({
      uri: "mongodb://db.example:27017",
      database: "city_lighting",
      usingLocalDefault: false,
    });
  });
});
