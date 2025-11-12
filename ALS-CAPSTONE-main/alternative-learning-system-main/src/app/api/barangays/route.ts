import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("main");
    const barangays = await db.collection("barangays").find({}).toArray();
    return NextResponse.json(barangays);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, error: "Failed to fetch barangays" }, { status: 500 });
  }
}
