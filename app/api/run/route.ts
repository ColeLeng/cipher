import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Cipher pipeline route is not implemented yet." },
    { status: 501 }
  );
}
