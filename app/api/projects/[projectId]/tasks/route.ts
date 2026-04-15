import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getAuthUser } from "@/lib/auth";
import Project from "@/models/Project";
import Task from "@/models/Task";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = getAuthUser(request);
  if (!auth) return NextResponse.json({ message: "No token, access denied" }, { status: 401 });

  const { projectId } = await params;

  await connectDB();

  const project = await Project.findOne({ _id: projectId, createdBy: auth.id });
  if (!project) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "10");
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  // Filtered query (for task list + pagination)
  const filter: Record<string, unknown> = { projectId };
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;
  const total = await Task.countDocuments(filter);
  const tasks = await Task.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);

  // Project-wide stats (always unfiltered — shows full project health)
  const now = new Date();
  const baseFilter = { projectId };
  const [todoCount, inProgressCount, completedCount, overdueCount] = await Promise.all([
    Task.countDocuments({ ...baseFilter, status: "todo" }),
    Task.countDocuments({ ...baseFilter, status: "in-progress" }),
    Task.countDocuments({ ...baseFilter, status: "completed" }),
    Task.countDocuments({ ...baseFilter, dueDate: { $lt: now }, status: { $ne: "completed" } }),
  ]);

  return NextResponse.json({
    tasks,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
    stats: {
      total: todoCount + inProgressCount + completedCount,
      todo: todoCount,
      inProgress: inProgressCount,
      completed: completedCount,
      overdue: overdueCount,
    },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = getAuthUser(request);
  if (!auth) return NextResponse.json({ message: "No token, access denied" }, { status: 401 });

  const { projectId } = await params;

  await connectDB();

  const project = await Project.findOne({ _id: projectId, createdBy: auth.id });
  if (!project) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 });
  }

  const { title, description, status, priority, dueDate } = await request.json();

  if (!title) {
    return NextResponse.json({ message: "Task title is required" }, { status: 400 });
  }

  const task = await Task.create({
    title,
    description,
    status,
    priority,
    dueDate: dueDate || undefined,
    projectId,
  });

  return NextResponse.json({ message: "Task added", task }, { status: 201 });
}
