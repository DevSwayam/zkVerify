import { NextResponse } from "next/server";
import { BACKEND_URL, WHITELISTED_NETWORKS } from "@/lib/constants";

export async function GET() {
  try {
    // await new Promise((resolve) => setTimeout(resolve, 5000));
    return NextResponse.json({
      success: true,
      data: WHITELISTED_NETWORKS,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch networks",
      },
      { status: 500 }
    );
  }
}


