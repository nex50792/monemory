import { readFileSync } from "fs";
import { NextResponse } from "next/server";
import { join } from "path";

const yamlContent = readFileSync(
  join(process.cwd(), "public", "api_reference", "openapi.yaml"),
  "utf-8"
);

export async function GET() {
  return new NextResponse(yamlContent, {
    headers: {
      "Content-Type": "text/yaml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
