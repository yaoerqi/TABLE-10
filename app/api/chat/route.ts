import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Message = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  try {
    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!deepseekKey && !geminiKey) {
      return NextResponse.json(
        { ok: false, message: "Missing DEEPSEEK_API_KEY or GEMINI_API_KEY" },
        { status: 500 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      messages?: Message[];
      prompt?: string;
    };

    const messages = Array.isArray(body.messages) ? body.messages : [];
    const prompt = (body.prompt ?? "").toString().trim();

    const contents =
      messages.length > 0
        ? messages
            .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
            .map((m) => ({
              role: m.role === "assistant" ? "model" : "user",
              parts: [{ text: m.content }]
            }))
        : prompt
          ? [{ role: "user", parts: [{ text: prompt }] }]
          : [];

    if (contents.length === 0) {
      return NextResponse.json({ ok: false, message: "Missing messages/prompt" }, { status: 400 });
    }

    // Prefer DeepSeek if configured (no Gemini quota/billing issues).
    if (deepseekKey) {
      const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
      const upstream = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${deepseekKey}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model,
          temperature: 0.7,
          max_tokens: 512,
          messages: contents.map((c) => ({
            role: c.role === "model" ? "assistant" : "user",
            content: c.parts?.[0]?.text ?? ""
          }))
        })
      });

      const json = await upstream.json().catch(() => ({} as any));
      if (!upstream.ok) {
        return NextResponse.json(
          {
            ok: false,
            message: "DeepSeek request failed",
            status: upstream.status,
            details: json
          },
          { status: 502 }
        );
      }

      const text = (json?.choices?.[0]?.message?.content ?? "").toString().trim();
      return NextResponse.json({ ok: true, text, provider: "deepseek", model });
    }

    // Fallback: Gemini.
    // Note: `gemini-1.5-flash` is no longer available on v1beta for some accounts.
    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
      geminiKey as string
    )}`;

    const upstream = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 512
        }
      })
    });

    const json = await upstream.json().catch(() => ({} as any));
    if (!upstream.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: "Gemini request failed",
          status: upstream.status,
          details: json
        },
        { status: 502 }
      );
    }

    const text =
      json?.candidates?.[0]?.content?.parts
        ?.map((p: any) => (typeof p?.text === "string" ? p.text : ""))
        .join("")
        .trim() ?? "";

    return NextResponse.json({ ok: true, text, provider: "gemini", model });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

