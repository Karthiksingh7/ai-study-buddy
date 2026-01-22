import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, type = "chat", imageData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    let userMessages = messages;

    if (type === "chat") {
      systemPrompt = `You are StudyBuddy AI, a friendly and knowledgeable study companion for students. 
You help with:
- Explaining complex concepts in simple terms
- Breaking down difficult topics
- Providing study tips and strategies
- Answering homework questions with explanations
- Encouraging and motivating students

Be warm, supportive, and educational. Use examples when helpful. Keep responses concise but thorough.`;
    } else if (type === "image_explain") {
      systemPrompt = `You are an expert at analyzing images of notes, textbook pages, problems, and educational content.
When given an image, you should:
1. Identify what's in the image (notes, math problem, diagram, etc.)
2. Extract and explain the key concepts
3. Provide additional context or explanations
4. If it's a problem, show how to solve it step by step

Be thorough but clear in your explanations.`;

      if (imageData) {
        userMessages = [
          {
            role: "user",
            content: [
              { type: "text", text: messages[0]?.content || "Please analyze this image and explain its contents." },
              { type: "image_url", image_url: { url: imageData } }
            ]
          }
        ];
      }
    } else if (type === "flashcard") {
      systemPrompt = `You are an expert at creating effective study flashcards. Generate exactly 5 flashcards for the given topic.
Return your response as a JSON array with this exact format:
[{"question": "...", "answer": "..."}]

Make questions clear and specific. Make answers concise but complete.
Only return the JSON array, no other text.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...userMessages,
        ],
        stream: type === "chat",
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "chat") {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    } else {
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Chat function error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
