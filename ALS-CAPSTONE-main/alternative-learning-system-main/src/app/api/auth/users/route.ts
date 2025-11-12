import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("main");
    const body = await req.json();
    const authKey = body?.authKey;

    const isAuthenticated = bcrypt.compareSync(
      authKey,
      "$2b$10$hPyu2aRgaW3/MkCADGuNHOtjvo/6uJSDS5YJgwcfUJuZ379gSRwYi"
    );
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const users = await db.collection("users").find({}).toArray();
    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("main");
    const body = await req.json();
    const authKey = body?.authKey;

    console.log(body);
    const isAuthenticated = bcrypt.compareSync(
      authKey,
      "$2b$10$hPyu2aRgaW3/MkCADGuNHOtjvo/6uJSDS5YJgwcfUJuZ379gSRwYi"
    );
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = body?.user._id;
    delete body?.user._id; // Remove the user ID from the update body

    // Update the user in the database
    const result = await db
      .collection("users")
      .updateOne(
        { _id: ObjectId.createFromHexString(userId) },
        { $set: { ...body.user, updatedAt: new Date().toISOString() } }
      );

    console.log(result);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("main");
    const body = await req.json();
    const authKey = body?.authKey;

    const isAuthenticated = bcrypt.compareSync(
      authKey,
      "$2b$10$hPyu2aRgaW3/MkCADGuNHOtjvo/6uJSDS5YJgwcfUJuZ379gSRwYi"
    );
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = body?.user._id;

    // Delete the user from the database
    const result = await db.collection("users").deleteOne({
      _id: ObjectId.createFromHexString(userId),
    });

    console.log(result);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete user" },
      { status: 500 }
    );
  }
}