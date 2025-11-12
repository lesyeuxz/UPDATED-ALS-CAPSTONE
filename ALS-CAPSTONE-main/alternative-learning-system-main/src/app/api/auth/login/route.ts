import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 }
      );
    }

    const email = body?.email;

    // Validate email
    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    // Validate password
    const password = body?.password;
    if (!password) {
      return NextResponse.json(
        { success: false, error: "Password is required" },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    let client;
    try {
      client = await clientPromise;
      // Ensure the client is connected
      if (!client) {
        throw new Error("MongoDB client is not initialized");
      }
    } catch (dbError) {
      console.error("MongoDB connection error:", dbError);
      const errorDetails = dbError instanceof Error ? dbError.message : String(dbError);
      return NextResponse.json(
        { 
          success: false, 
          error: "Database connection failed. Please check your MongoDB configuration.",
          details: process.env.NODE_ENV === "development" ? errorDetails : undefined
        },
        { status: 500 }
      );
    }

    let db;
    let userData;
    try {
      db = client.db("main");
      userData = await db.collection("users").find({ email }).toArray();
    } catch (queryError) {
      console.error("MongoDB query error:", queryError);
      const errorDetails = queryError instanceof Error ? queryError.message : String(queryError);
      return NextResponse.json(
        { 
          success: false, 
          error: "Database query failed.",
          details: process.env.NODE_ENV === "development" ? errorDetails : undefined
        },
        { status: 500 }
      );
    }

    // Check if user exists
    if (userData.length === 0) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const isPasswordValid = bcrypt.compareSync(password, userData[0].password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: "Invalid Password" },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true, data: userData[0] });
  } catch (error) {
    console.error("Error authenticating user:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to Authenticate User";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: process.env.NODE_ENV === "development" ? (errorStack || String(error)) : undefined
      },
      { status: 500 }
    );
  }
}