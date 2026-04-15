import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getAuthUser } from "@/lib/auth";
import Project from "@/models/Project";
import Task from "@/models/Task";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = getAuthUser(request);
  if (!auth) return NextResponse.json({ message: "No token, access denied" }, { status: 401 });

  const { projectId } = await params;

  await connectDB();

  const project = await Project.findOneAndDelete({ _id: projectId, createdBy: auth.id });
  if (!project) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 });
  }

  await Task.deleteMany({ projectId });

  return NextResponse.json({ message: "Project deleted successfully" });
}
