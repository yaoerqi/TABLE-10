import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Message = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: false, message: "Missing GEMINI_API_KEY" }, { status: 500 });
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

    // Use a lightweight model by default. You can switch to other Gemini models later.
    const model = "gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
      apiKey
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

    return NextResponse.json({ ok: true, text });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

