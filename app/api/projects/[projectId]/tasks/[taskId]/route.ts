import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getAuthUser } from "@/lib/auth";
import Project from "@/models/Project";
import Task from "@/models/Task";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; taskId: string }> }
) {
  const auth = getAuthUser(request);
  if (!auth) return NextResponse.json({ message: "No token, access denied" }, { status: 401 });

  const { projectId, taskId } = await params;

  await connectDB();

  const task = await Task.findById(taskId);
  if (!task) {
    return NextResponse.json({ message: "Task not found" }, { status: 404 });
  }

  const project = await Project.findOne({ _id: projectId, createdBy: auth.id });
  if (!project) {
    return NextResponse.json({ message: "Not authorized" }, { status: 403 });
  }

  const { title, description, status, priority, dueDate } = await request.json();

  if (title) task.title = title;
  if (description !== undefined) task.description = description;
  if (status) task.status = status;
  if (priority) task.priority = priority;
  if (dueDate) task.dueDate = dueDate;

  await task.save();

  return NextResponse.json({ message: "Task updated", task });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; taskId: string }> }
) {
  const auth = getAuthUser(request);
  if (!auth) return NextResponse.json({ message: "No token, access denied" }, { status: 401 });

  const { projectId, taskId } = await params;

  await connectDB();

  const task = await Task.findById(taskId);
  if (!task) {
    return NextResponse.json({ message: "Task not found" }, { status: 404 });
  }

  const project = await Project.findOne({ _id: projectId, createdBy: auth.id });
  if (!project) {
    return NextResponse.json({ message: "Not authorized" }, { status: 403 });
  }

  await task.deleteOne();

  return NextResponse.json({ message: "Task deleted successfully" });
}
