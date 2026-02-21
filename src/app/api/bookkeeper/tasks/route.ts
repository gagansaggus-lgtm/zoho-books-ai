import { NextRequest, NextResponse } from "next/server";
import {
  getTaskQueue,
  addTask,
  executeTask,
  processAllTasks,
  generateDailyTasks,
  answerQuestion,
  clearCompletedTasks,
  removeTask,
} from "@/lib/autonomous-bookkeeper";
import { isZohoConnected } from "@/lib/zoho-auth";

// GET - Get task queue
export async function GET() {
  try {
    const tasks = getTaskQueue();
    const summary = {
      total: tasks.length,
      pending: tasks.filter((t) => t.status === "pending").length,
      running: tasks.filter((t) => t.status === "running").length,
      completed: tasks.filter((t) => t.status === "completed").length,
      failed: tasks.filter((t) => t.status === "failed").length,
      needsInput: tasks.filter((t) => t.status === "needs_input").length,
    };
    return NextResponse.json({ tasks, summary });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get tasks" },
      { status: 500 }
    );
  }
}

// POST - Add task, generate daily tasks, execute task, or process all
export async function POST(request: NextRequest) {
  try {
    const connected = await isZohoConnected();
    if (!connected) {
      return NextResponse.json(
        { error: "Zoho Books not connected. Please connect via Settings." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "generate_daily": {
        const tasks = await generateDailyTasks();
        return NextResponse.json({ success: true, tasks, message: `Generated ${tasks.length} daily tasks` });
      }

      case "execute": {
        const { taskId } = body;
        if (!taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 });
        const task = await executeTask(taskId);
        return NextResponse.json({ success: true, task });
      }

      case "execute_all": {
        // Start processing in background (non-blocking)
        processAllTasks().catch(console.error);
        return NextResponse.json({ success: true, message: "Processing all pending tasks..." });
      }

      case "add": {
        const { type, title, description, priority } = body;
        const task = addTask({
          type: type || "custom",
          title: title || "Custom task",
          description: description || "",
          priority: priority || "medium",
        });
        return NextResponse.json({ success: true, task });
      }

      case "answer": {
        const { taskId: tid, answer } = body;
        const ok = answerQuestion(tid, answer);
        return NextResponse.json({ success: ok });
      }

      case "clear_completed": {
        clearCompletedTasks();
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error("Bookkeeper tasks error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Task operation failed" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a task
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");
    if (!taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 });

    const ok = removeTask(taskId);
    return NextResponse.json({ success: ok });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to remove task" },
      { status: 500 }
    );
  }
}
