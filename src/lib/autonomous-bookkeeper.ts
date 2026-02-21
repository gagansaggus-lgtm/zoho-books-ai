import prisma from "@/lib/prisma";
import * as zoho from "@/lib/zoho-api";
import { chatWithClaude } from "@/lib/claude";
import { BOOKKEEPER_SYSTEM_PROMPT, BOOKKEEPER_TOOLS } from "@/lib/prompts";
import { executeToolCall } from "@/lib/tool-executor";

export interface BookkeeperTask {
  id: string;
  type: string;
  title: string;
  description: string;
  status: "pending" | "running" | "completed" | "failed" | "needs_input";
  priority: "high" | "medium" | "low";
  result?: string;
  error?: string;
  question?: string;
  createdAt: string;
  completedAt?: string;
}

// In-memory task queue (could be moved to DB for persistence)
let taskQueue: BookkeeperTask[] = [];
let isRunning = false;

export function getTaskQueue(): BookkeeperTask[] {
  return [...taskQueue];
}

export function addTask(task: Omit<BookkeeperTask, "id" | "createdAt" | "status">): BookkeeperTask {
  const newTask: BookkeeperTask = {
    ...task,
    id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  taskQueue.push(newTask);
  return newTask;
}

export function answerQuestion(taskId: string, answer: string): boolean {
  const task = taskQueue.find((t) => t.id === taskId);
  if (task && task.status === "needs_input") {
    task.result = answer;
    task.status = "pending"; // Re-queue for processing
    return true;
  }
  return false;
}

export function clearCompletedTasks(): void {
  taskQueue = taskQueue.filter((t) => t.status !== "completed" && t.status !== "failed");
}

export function removeTask(taskId: string): boolean {
  const idx = taskQueue.findIndex((t) => t.id === taskId);
  if (idx >= 0) {
    taskQueue.splice(idx, 1);
    return true;
  }
  return false;
}

// ============ Task Generators ============

export async function generateDailyTasks(): Promise<BookkeeperTask[]> {
  const tasks: BookkeeperTask[] = [];

  // 1. Check for uncategorized bank transactions
  tasks.push(addTask({
    type: "categorize_transactions",
    title: "Categorize uncategorized bank transactions",
    description: "Review and categorize any uncategorized bank transactions using AI-powered categorization.",
    priority: "high",
  }));

  // 2. Check for overdue invoices that need follow-up
  tasks.push(addTask({
    type: "overdue_followup",
    title: "Review overdue invoices",
    description: "Check for overdue invoices and prepare follow-up actions.",
    priority: "high",
  }));

  // 3. Review unmatched bank transactions for reconciliation
  tasks.push(addTask({
    type: "reconcile_transactions",
    title: "Reconcile bank transactions",
    description: "Match unmatched bank transactions to invoices, bills, and expenses.",
    priority: "medium",
  }));

  // 4. Check for bills due soon
  tasks.push(addTask({
    type: "upcoming_bills",
    title: "Review upcoming bills",
    description: "Check for bills due in the next 7 days and ensure they are ready for payment.",
    priority: "medium",
  }));

  // 5. Quick financial health check
  tasks.push(addTask({
    type: "health_check",
    title: "Daily financial health check",
    description: "Run a quick check on cash position, outstanding receivables, and any anomalies.",
    priority: "low",
  }));

  return tasks;
}

// ============ Task Executor ============

export async function executeTask(taskId: string): Promise<BookkeeperTask> {
  const task = taskQueue.find((t) => t.id === taskId);
  if (!task) throw new Error("Task not found");

  const settings = await prisma.settings.findUnique({ where: { id: "default" } });
  if (!settings?.anthropicApiKey) throw new Error("API key not configured");

  task.status = "running";

  try {
    switch (task.type) {
      case "categorize_transactions":
        task.result = await runCategorizationTask(settings.anthropicApiKey, settings.aiModel);
        break;
      case "overdue_followup":
        task.result = await runOverdueFollowupTask(settings.anthropicApiKey, settings.aiModel);
        break;
      case "reconcile_transactions":
        task.result = await runReconciliationTask(settings.anthropicApiKey, settings.aiModel);
        break;
      case "upcoming_bills":
        task.result = await runUpcomingBillsTask(settings.anthropicApiKey, settings.aiModel);
        break;
      case "health_check":
        task.result = await runHealthCheckTask(settings.anthropicApiKey, settings.aiModel);
        break;
      case "custom":
        task.result = await runCustomTask(task.description, settings.anthropicApiKey, settings.aiModel);
        break;
      default:
        task.result = await runCustomTask(task.description, settings.anthropicApiKey, settings.aiModel);
    }

    task.status = "completed";
    task.completedAt = new Date().toISOString();
  } catch (error) {
    task.status = "failed";
    task.error = error instanceof Error ? error.message : "Unknown error";
  }

  return task;
}

// Process all pending tasks sequentially
export async function processAllTasks(): Promise<void> {
  if (isRunning) return;
  isRunning = true;

  try {
    const pending = taskQueue.filter((t) => t.status === "pending");
    // Sort by priority: high first
    pending.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.priority] - order[b.priority];
    });

    for (const task of pending) {
      await executeTask(task.id);
    }
  } finally {
    isRunning = false;
  }
}

// ============ Individual Task Runners ============

async function runWithClaude(
  instruction: string,
  apiKey: string,
  model: string
): Promise<string> {
  const messages: Array<{ role: "user" | "assistant"; content: string | unknown[] }> = [
    { role: "user", content: instruction },
  ];

  let finalText = "";
  let loops = 0;
  const maxLoops = 10;

  while (loops < maxLoops) {
    loops++;
    const response = await chatWithClaude({
      apiKey,
      model,
      temperature: 0.2,
      systemPrompt: BOOKKEEPER_SYSTEM_PROMPT,
      messages,
      tools: BOOKKEEPER_TOOLS,
      maxTokens: 4096,
    });

    // Check if response needs tool use
    const toolBlocks = response.content.filter((b) => b.type === "tool_use");
    const textBlocks = response.content.filter((b) => b.type === "text");

    if (textBlocks.length > 0) {
      finalText = textBlocks
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("\n");
    }

    if (toolBlocks.length === 0 || response.stop_reason === "end_turn") {
      break;
    }

    // Execute tools
    const assistantContent = response.content;
    messages.push({ role: "assistant", content: assistantContent as unknown[] });

    const toolResults: unknown[] = [];
    for (const block of toolBlocks) {
      const toolBlock = block as { type: "tool_use"; id: string; name: string; input: Record<string, unknown> };
      try {
        const result = await executeToolCall(toolBlock.name, toolBlock.input, true);
        let resultStr = JSON.stringify(result);
        if (resultStr.length > 50000) {
          resultStr = resultStr.substring(0, 50000) + "... [truncated]";
        }
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolBlock.id,
          content: resultStr,
        });
      } catch (error) {
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolBlock.id,
          content: JSON.stringify({ error: error instanceof Error ? error.message : "Tool execution failed" }),
          is_error: true,
        });
      }
    }
    messages.push({ role: "user", content: toolResults });
  }

  return finalText || "Task completed but no summary was generated.";
}

async function runCategorizationTask(apiKey: string, model: string): Promise<string> {
  return runWithClaude(
    `Review all bank accounts for uncategorized transactions. For each uncategorized transaction:
1. Use list_bank_accounts to find all bank accounts
2. For each account, check for uncategorized transactions
3. Categorize them based on the description, amount, and payee
4. Apply categorization using categorize_transaction tool
5. Summarize what you categorized

This is for Transway Group, a Canadian trucking company. Common categories:
- Fuel purchases from gas stations
- Vehicle maintenance and repairs
- Insurance payments
- Driver wages
- Highway tolls
- Office supplies and admin

Report back what you did.`,
    apiKey,
    model
  );
}

async function runOverdueFollowupTask(apiKey: string, model: string): Promise<string> {
  return runWithClaude(
    `Check for overdue invoices and prepare a summary:
1. Use list_invoices with status "overdue" to find all overdue invoices
2. For each overdue invoice, note:
   - Invoice number, customer name, amount, days overdue
   - If over 90 days: critical
   - If over 30 days: warning
3. Summarize the total outstanding amount
4. Recommend which invoices need immediate follow-up
5. Suggest if any payment reminders should be sent

Provide a clear summary with actionable recommendations.`,
    apiKey,
    model
  );
}

async function runReconciliationTask(apiKey: string, model: string): Promise<string> {
  return runWithClaude(
    `Review bank accounts for unmatched transactions:
1. List all bank accounts
2. For each account, check for transactions that can be matched to invoices or bills
3. Match transactions where you have high confidence (exact amount match)
4. Report any transactions you couldn't match and suggest what they might be
5. Summarize the reconciliation status

Use the match_bank_transaction tool for high-confidence matches.
For uncertain matches, just report them.`,
    apiKey,
    model
  );
}

async function runUpcomingBillsTask(apiKey: string, model: string): Promise<string> {
  return runWithClaude(
    `Check for upcoming bills due in the next 7 days:
1. Use list_bills to get all open bills
2. Filter for bills due within 7 days
3. Check if payments are already scheduled
4. Calculate the total amount due
5. Flag any bills that might cause cash flow issues

Provide a summary with:
- List of bills due soon
- Total amount due
- Any cash flow concerns
- Recommended actions`,
    apiKey,
    model
  );
}

async function runHealthCheckTask(apiKey: string, model: string): Promise<string> {
  return runWithClaude(
    `Perform a daily financial health check for Transway Group:
1. Check bank account balances (list_bank_accounts)
2. Total outstanding receivables (list_invoices with status "sent" and "overdue")
3. Total outstanding payables (list_bills with status "open")
4. Recent expenses in the last 7 days (list_expenses)
5. Any flagged or unusual items

Provide a brief dashboard-style summary:
- Cash Position: total across bank accounts
- Receivables: total outstanding
- Payables: total outstanding
- Net position
- Any concerns or action items`,
    apiKey,
    model
  );
}

async function runCustomTask(description: string, apiKey: string, model: string): Promise<string> {
  return runWithClaude(description, apiKey, model);
}
