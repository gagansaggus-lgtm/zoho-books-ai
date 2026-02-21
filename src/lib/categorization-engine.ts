import prisma from "@/lib/prisma";
import * as zoho from "@/lib/zoho-api";
import { chatWithClaude } from "@/lib/claude";

interface CategorizationSuggestion {
  transactionId: string;
  description: string;
  amount: number;
  date: string;
  suggestedAccountId: string;
  suggestedAccountName: string;
  suggestedVendorId?: string;
  suggestedVendorName?: string;
  confidence: number;
  reasoning: string;
}

export async function getCategorizationSuggestions(
  accountId: string,
  apiKey: string,
  model: string
): Promise<CategorizationSuggestion[]> {
  // 1. Get uncategorized transactions
  const uncategorized = await zoho.getUncategorizedTransactions(accountId, true) as Record<string, unknown>[];

  if (!uncategorized || uncategorized.length === 0) {
    return [];
  }

  // 2. Get chart of accounts for reference
  const chartOfAccounts = await zoho.listChartOfAccounts({ account_type: "expense" }, true);

  // 3. Get learned rules from past categorizations
  const rules = await prisma.bookkeepingRule.findMany({
    where: { ruleType: "categorization" },
    orderBy: { usageCount: "desc" },
    take: 50,
  });

  // 4. Apply rule-based matching first
  const suggestions: CategorizationSuggestion[] = [];
  const needsAI: Record<string, unknown>[] = [];

  for (const txn of uncategorized) {
    const desc = ((txn.description as string) || (txn.payee as string) || "").toLowerCase();
    const matchedRule = rules.find((r) => desc.includes(r.pattern.toLowerCase()));

    if (matchedRule && matchedRule.confidence >= 0.8) {
      suggestions.push({
        transactionId: txn.transaction_id as string,
        description: (txn.description as string) || (txn.payee as string) || "",
        amount: (txn.amount as number) || 0,
        date: (txn.date as string) || "",
        suggestedAccountId: matchedRule.accountId,
        suggestedAccountName: matchedRule.accountName,
        confidence: matchedRule.confidence,
        reasoning: `Matched rule: "${matchedRule.pattern}" -> ${matchedRule.accountName} (used ${matchedRule.usageCount} times)`,
      });
    } else {
      needsAI.push(txn);
    }
  }

  // 5. Use AI for remaining transactions
  if (needsAI.length > 0 && apiKey) {
    const aiSuggestions = await getAICategorizationSuggestions(
      needsAI,
      chartOfAccounts as Record<string, unknown>[],
      apiKey,
      model
    );
    suggestions.push(...aiSuggestions);
  }

  return suggestions;
}

async function getAICategorizationSuggestions(
  transactions: Record<string, unknown>[],
  chartOfAccounts: Record<string, unknown>[],
  apiKey: string,
  model: string
): Promise<CategorizationSuggestion[]> {
  const accountList = (chartOfAccounts as Record<string, unknown>[])
    .map((a) => `- ${a.account_name} (ID: ${a.account_id}, Type: ${a.account_type})`)
    .join("\n");

  const txnList = transactions.slice(0, 30).map((t) => ({
    id: t.transaction_id,
    description: t.description || t.payee || "Unknown",
    amount: t.amount,
    date: t.date,
    debit_or_credit: t.debit_or_credit,
  }));

  const prompt = `You are categorizing bank transactions for Transway Group, a Canadian trucking company.

Here are the expense accounts available:
${accountList}

Here are uncategorized bank transactions to categorize:
${JSON.stringify(txnList, null, 2)}

TRUCKING BUSINESS CONTEXT:
- Fuel/gas stations -> Fuel Expense
- Vehicle parts, repairs -> Vehicle Maintenance & Repairs
- Insurance payments -> Insurance Expense
- Permit/license fees -> Permits & Licenses
- Toll charges -> Tolls & Highway Fees
- Phone/internet -> Office & Admin
- Restaurant/food -> Meals & Entertainment
- Software/subscriptions -> Office & Admin or Software Subscriptions

For each transaction, provide:
- The best matching account ID and name
- A confidence score (0.0 to 1.0)
- Brief reasoning

Return as JSON array:
[{
  "transactionId": "string",
  "suggestedAccountId": "string",
  "suggestedAccountName": "string",
  "confidence": 0.0-1.0,
  "reasoning": "string"
}]

Return ONLY the JSON array.`;

  try {
    const response = await chatWithClaude({
      apiKey,
      model,
      temperature: 0.1,
      systemPrompt: "You categorize bank transactions for a trucking company. Return only valid JSON.",
      messages: [{ role: "user", content: prompt }],
      maxTokens: 4096,
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as Array<{
        transactionId: string;
        suggestedAccountId: string;
        suggestedAccountName: string;
        confidence: number;
        reasoning: string;
      }>;

      return parsed.map((s) => {
        const txn = transactions.find((t) => t.transaction_id === s.transactionId);
        return {
          transactionId: s.transactionId,
          description: (txn?.description as string) || (txn?.payee as string) || "",
          amount: (txn?.amount as number) || 0,
          date: (txn?.date as string) || "",
          suggestedAccountId: s.suggestedAccountId,
          suggestedAccountName: s.suggestedAccountName,
          confidence: s.confidence,
          reasoning: s.reasoning,
        };
      });
    }
  } catch (error) {
    console.error("AI categorization failed:", error);
  }

  return [];
}

export async function applyCategorization(
  transactionId: string,
  accountId: string,
  accountName: string,
  description: string
): Promise<void> {
  // Apply the categorization in Zoho
  await zoho.categorizeTransaction(transactionId, accountId, {}, true);

  // Learn from this categorization — save/update rule
  const pattern = description.toLowerCase().trim();
  if (pattern.length > 2) {
    const existing = await prisma.bookkeepingRule.findFirst({
      where: { ruleType: "categorization", pattern },
    });

    if (existing) {
      await prisma.bookkeepingRule.update({
        where: { id: existing.id },
        data: {
          accountId,
          accountName,
          usageCount: existing.usageCount + 1,
          confidence: Math.min(1.0, existing.confidence + 0.05),
        },
      });
    } else {
      await prisma.bookkeepingRule.create({
        data: {
          ruleType: "categorization",
          pattern,
          category: accountName,
          accountId,
          accountName,
          confidence: 0.7,
          usageCount: 1,
        },
      });
    }
  }
}

export async function getReconciliationSuggestions(
  accountId: string,
  apiKey: string,
  model: string
): Promise<Array<{
  transactionId: string;
  description: string;
  amount: number;
  date: string;
  matchType: string;
  matchId: string;
  matchDescription: string;
  confidence: number;
  reasoning: string;
}>> {
  // Get uncategorized transactions
  const uncategorized = await zoho.getUncategorizedTransactions(accountId, true) as Record<string, unknown>[];
  if (!uncategorized || uncategorized.length === 0) return [];

  // For each transaction, find potential matches
  const suggestions: Array<{
    transactionId: string;
    description: string;
    amount: number;
    date: string;
    matchType: string;
    matchId: string;
    matchDescription: string;
    confidence: number;
    reasoning: string;
  }> = [];

  // Get recent invoices and bills for matching
  const invoices = await zoho.listInvoices({ status: "sent" }, true) as Record<string, unknown>[];
  const bills = await zoho.listBills({ status: "open" }, true) as Record<string, unknown>[];

  for (const txn of uncategorized.slice(0, 20)) {
    const amount = Math.abs((txn.amount as number) || 0);
    const isDebit = (txn.debit_or_credit as string) === "debit";

    // Match deposits to invoices, debits to bills
    const candidates = isDebit ? bills : invoices;
    const matchField = isDebit ? "total" : "total";
    const matchType = isDebit ? "bill" : "invoice";

    // Find exact amount matches
    const exactMatches = candidates.filter(
      (c) => Math.abs((c[matchField] as number) - amount) < 0.01
    );

    if (exactMatches.length === 1) {
      const match = exactMatches[0];
      suggestions.push({
        transactionId: txn.transaction_id as string,
        description: (txn.description as string) || (txn.payee as string) || "",
        amount,
        date: (txn.date as string) || "",
        matchType,
        matchId: (match[`${matchType}_id`] as string) || "",
        matchDescription: `${match[`${matchType}_number`]} - ${match.customer_name || match.vendor_name} ($${match.total})`,
        confidence: 0.95,
        reasoning: "Exact amount match",
      });
    } else if (exactMatches.length > 1) {
      // Multiple matches - use AI to pick best one
      const best = exactMatches[0]; // Default to first match
      suggestions.push({
        transactionId: txn.transaction_id as string,
        description: (txn.description as string) || (txn.payee as string) || "",
        amount,
        date: (txn.date as string) || "",
        matchType,
        matchId: (best[`${matchType}_id`] as string) || "",
        matchDescription: `${best[`${matchType}_number`]} - ${best.customer_name || best.vendor_name} ($${best.total})`,
        confidence: 0.7,
        reasoning: `${exactMatches.length} exact amount matches found. Closest date selected.`,
      });
    }
  }

  // Use AI for remaining unmatched if we have API key
  if (apiKey && suggestions.length < uncategorized.length) {
    const unmatchedIds = new Set(suggestions.map((s) => s.transactionId));
    const unmatched = uncategorized.filter(
      (t) => !unmatchedIds.has(t.transaction_id as string)
    ).slice(0, 10);

    if (unmatched.length > 0) {
      try {
        const response = await chatWithClaude({
          apiKey,
          model,
          temperature: 0.1,
          systemPrompt: "You match bank transactions to invoices/bills. Return JSON only.",
          messages: [{
            role: "user",
            content: `Match these bank transactions to the open invoices/bills for a trucking company:

Unmatched transactions:
${JSON.stringify(unmatched.map((t) => ({
  id: t.transaction_id,
  desc: t.description || t.payee,
  amount: t.amount,
  date: t.date,
  type: t.debit_or_credit,
})), null, 2)}

Open invoices:
${JSON.stringify(invoices.slice(0, 30).map((i) => ({
  id: i.invoice_id,
  number: i.invoice_number,
  customer: i.customer_name,
  total: i.total,
  balance: i.balance,
  date: i.date,
})), null, 2)}

Open bills:
${JSON.stringify(bills.slice(0, 30).map((b) => ({
  id: b.bill_id,
  number: b.bill_number,
  vendor: b.vendor_name,
  total: b.total,
  balance: b.balance,
  date: b.date,
})), null, 2)}

Return JSON array of matches:
[{"transactionId":"","matchType":"invoice"|"bill","matchId":"","confidence":0.0-1.0,"reasoning":""}]`,
          }],
          maxTokens: 2048,
        });

        const text = response.content
          .filter((b) => b.type === "text")
          .map((b) => (b as { type: "text"; text: string }).text)
          .join("");

        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as Array<{
            transactionId: string;
            matchType: string;
            matchId: string;
            confidence: number;
            reasoning: string;
          }>;

          for (const match of parsed) {
            if (match.confidence < 0.5) continue;
            const txn = uncategorized.find((t) => t.transaction_id === match.transactionId);
            if (!txn) continue;

            suggestions.push({
              transactionId: match.transactionId,
              description: (txn.description as string) || (txn.payee as string) || "",
              amount: Math.abs((txn.amount as number) || 0),
              date: (txn.date as string) || "",
              matchType: match.matchType,
              matchId: match.matchId,
              matchDescription: match.reasoning,
              confidence: match.confidence,
              reasoning: match.reasoning,
            });
          }
        }
      } catch (error) {
        console.error("AI reconciliation matching failed:", error);
      }
    }
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence);
}
