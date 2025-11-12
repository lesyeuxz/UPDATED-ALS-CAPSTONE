import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("main");
    const modules = await db.collection("modules").find({}).toArray();
    return NextResponse.json(modules);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, error: "Failed to fetch modules" }, { status: 500 });
  }
}
