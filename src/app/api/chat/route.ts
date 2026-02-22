import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { chatWithClaude } from "@/lib/claude";
import { BOOKKEEPER_SYSTEM_PROMPT, BOOKKEEPER_TOOLS } from "@/lib/prompts";
import { executeToolCall } from "@/lib/tool-executor";
import { isZohoConnected } from "@/lib/zoho-auth";
import { getAnthropicApiKey } from "@/lib/settings-helper";

export async function POST(request: NextRequest) {
  try {
    const { conversationId, message } = await request.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Get settings
    const settings = await prisma.settings.findUnique({ where: { id: "default" } });
    const apiKey = await getAnthropicApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "Anthropic API key not configured. Please set it in Settings or ANTHROPIC_API_KEY env var." },
        { status: 400 }
      );
    }

    // Check Zoho connection
    const zohoConnected = await isZohoConnected();
    if (!zohoConnected) {
      return NextResponse.json(
        { error: "Zoho Books not connected. Please connect via Settings > Zoho OAuth." },
        { status: 400 }
      );
    }

    // Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { messages: { orderBy: { createdAt: "asc" }, take: 50 } },
      });
    }
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { title: message.substring(0, 80) },
        include: { messages: true },
      });
    }

    // Save user message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: message,
      },
    });

    // Build message history for Claude
    const claudeMessages: { role: "user" | "assistant"; content: string | unknown[] }[] =
      conversation.messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
    claudeMessages.push({ role: "user", content: message });

    const aiModel = settings?.aiModel || "claude-sonnet-4-20250514";
    const aiTemperature = settings?.aiTemperature ?? 0.3;

    // Call Claude with tools
    let response = await chatWithClaude({
      apiKey,
      model: aiModel,
      temperature: aiTemperature,
      systemPrompt: BOOKKEEPER_SYSTEM_PROMPT,
      messages: claudeMessages,
      tools: BOOKKEEPER_TOOLS,
    });

    const toolsUsed: string[] = [];
    let toolLoopCount = 0;
    const MAX_TOOL_LOOPS = 15;

    // Handle tool-use loop — Claude calls tools, we execute them and return results
    while (response.stop_reason === "tool_use" && toolLoopCount < MAX_TOOL_LOOPS) {
      toolLoopCount++;

      const toolUseBlocks = response.content
        .filter((b) => b.type === "tool_use")
        .map((b) => b as unknown as { type: "tool_use"; id: string; name: string; input: Record<string, unknown> });

      const toolResults: unknown[] = [];

      for (const toolUse of toolUseBlocks) {
        toolsUsed.push(toolUse.name);

        // ACTUALLY EXECUTE the tool via Zoho Books REST API
        const result = await executeToolCall(toolUse.name, toolUse.input, true);

        // Truncate very large results to avoid token overflow
        let resultContent: string;
        const resultStr = JSON.stringify(result);
        if (resultStr.length > 50000) {
          // For large datasets, summarize
          const data = result.data as unknown[];
          if (Array.isArray(data)) {
            resultContent = JSON.stringify({
              success: true,
              total_records: data.length,
              data: data.slice(0, 50),
              note: `Showing first 50 of ${data.length} records. Ask for specific filters to narrow down.`,
            });
          } else {
            resultContent = resultStr.substring(0, 50000) + "... [truncated]";
          }
        } else {
          resultContent = resultStr;
        }

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: resultContent,
        });
      }

      // Send tool results back to Claude
      claudeMessages.push({ role: "assistant", content: response.content as unknown[] });
      claudeMessages.push({ role: "user", content: toolResults });

      response = await chatWithClaude({
        apiKey,
        model: aiModel,
        temperature: aiTemperature,
        systemPrompt: BOOKKEEPER_SYSTEM_PROMPT,
        messages: claudeMessages,
        tools: BOOKKEEPER_TOOLS,
      });
    }

    // Extract final text response
    const assistantMessage = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("\n");

    // Save assistant response
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: assistantMessage,
        metadata: JSON.stringify({
          toolsUsed,
          model: aiModel,
          tokens: response.usage,
          toolLoops: toolLoopCount,
        }),
      },
    });

    // Update conversation title if first exchange
    if (conversation.messages.length === 0) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { title: message.substring(0, 80) },
      });
    }

    return NextResponse.json({
      conversationId: conversation.id,
      message: assistantMessage,
      metadata: { toolsUsed, toolLoops: toolLoopCount },
    });
  } catch (error) {
    console.error("POST /api/chat error:", error);

    // Helpful error for unconnected Zoho
    if (error instanceof Error && error.message === "ZOHO_NOT_CONNECTED") {
      return NextResponse.json(
        { error: "Zoho Books not connected. Go to Settings and connect your Zoho account via OAuth." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process chat" },
      { status: 500 }
    );
  }
}
