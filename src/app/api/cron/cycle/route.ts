import { NextRequest, NextResponse } from "next/server";
import { processDueCycles } from "@/server/services/scheduler.service";
import { serverConfig } from "@/server/config";
import type { ApiResponse } from "@/types";

export const GET = async (req: NextRequest) => {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token || token !== serverConfig.cronSecret) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }
  await processDueCycles();
  return NextResponse.json<ApiResponse<{ message: string }>>({
    success: true,
    data: { message: "Cycle check complete" },
  });
};
