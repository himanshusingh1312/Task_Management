import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getAuthUser } from "@/lib/auth";
import Project from "@/models/Project";
import Task from "@/models/Task";

export async function GET(request: NextRequest) {
  const auth = getAuthUser(request);
  if (!auth) return NextResponse.json({ message: "No token, access denied" }, { status: 401 });

  await connectDB();

  const projects = await Project.find({ createdBy: auth.id }).sort({ createdAt: -1 });

  // Aggregate task completion stats for all projects in one query
  const projectIds = projects.map((p) => p._id);
  const taskStats = await Task.aggregate([
    { $match: { projectId: { $in: projectIds } } },
    {
      $group: {
        _id: "$projectId",
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
      },
    },
  ]);

  const statsMap = new Map(
    taskStats.map((s: { _id: { toString(): string }; total: number; completed: number }) => [
      s._id.toString(),
      { total: s.total, completed: s.completed },
    ])
  );

  const projectsWithStats = projects.map((p) => ({
    ...p.toObject(),
    taskStats: statsMap.get(p._id.toString()) ?? { total: 0, completed: 0 },
  }));

  return NextResponse.json({ projects: projectsWithStats });
}

export async function POST(request: NextRequest) {
  const auth = getAuthUser(request);
  if (!auth) return NextResponse.json({ message: "No token, access denied" }, { status: 401 });

  const { projectName, description } = await request.json();

  if (!projectName) {
    return NextResponse.json({ message: "Project name is required" }, { status: 400 });
  }

  await connectDB();

  const project = await Project.create({ projectName, description, createdBy: auth.id });
  return NextResponse.json({ message: "Project created", project }, { status: 201 });
}
