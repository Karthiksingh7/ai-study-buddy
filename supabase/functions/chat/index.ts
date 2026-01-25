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
    const { messages, type = "chat", imageData, topic, difficulty, questionCount, studiedTopics, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    let userMessages = messages;
    let shouldStream = false;

    if (type === "chat") {
      shouldStream = true;
      let topicsContext = "";
      if (studiedTopics && studiedTopics.length > 0) {
        topicsContext = `\n\nThe student has previously studied these topics: ${studiedTopics.join(", ")}. 
You can reference their prior learning when relevant and suggest connections between topics.`;
      }
      
      systemPrompt = `You are StudyBuddy AI, a friendly and knowledgeable study companion for students. 
You help with:
- Explaining complex concepts in simple terms
- Breaking down difficult topics
- Providing study tips and strategies
- Answering homework questions with explanations
- Encouraging and motivating students
${topicsContext}
Be warm, supportive, and educational. Use examples when helpful. Keep responses concise but thorough.`;
    } else if (type === "learn") {
      shouldStream = true;
      systemPrompt = `You are StudyBuddy AI, an expert educational assistant. When a student asks about a topic:

1. Start with a clear, beginner-friendly explanation
2. Build up to more complex aspects
3. Use analogies and real-world examples
4. Highlight key points they should remember
5. Suggest what to learn next

Keep your explanation focused and educational. Be encouraging and make learning enjoyable.`;
    } else if (type === "community") {
      shouldStream = false;
      systemPrompt = `You are StudyBuddy AI, a helpful assistant in a student discussion group.
${context ? `Context: ${context}` : ""}

Your role:
- Answer questions clearly and accurately
- Correct any misinformation politely
- Summarize discussions if asked
- Highlight important points
- Encourage collaborative learning

Keep responses concise (2-3 paragraphs max). Be friendly and supportive.`;
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
    } else if (type === "quiz") {
      const difficultyDescriptions = {
        easy: "basic understanding, definitions, and simple recall questions",
        intermediate: "application of concepts, connections between ideas, and moderate problem-solving",
        hard: "complex analysis, synthesis of multiple concepts, and challenging problem-solving"
      };
      
      const diffDesc = difficultyDescriptions[difficulty as keyof typeof difficultyDescriptions] || difficultyDescriptions.intermediate;
      const count = questionCount || 5;
      
      systemPrompt = `You are an expert quiz creator. Generate exactly ${count} multiple-choice quiz questions about "${topic}" at the ${difficulty} difficulty level.

Difficulty description: ${diffDesc}

Return your response as a JSON array with this exact format:
[{
  "question": "The question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctIndex": 0,
  "explanation": "Brief explanation of why this answer is correct"
}]

Make sure:
- Each question has exactly 4 options
- correctIndex is 0-3 indicating which option is correct
- Questions are appropriate for the ${difficulty} level
- Include a helpful explanation for learning

Only return the JSON array, no other text.`;
      
      userMessages = [{ role: "user", content: `Generate ${count} ${difficulty} level quiz questions about: ${topic}` }];
    } else if (type === "extract_topic") {
      systemPrompt = `You are a topic extraction assistant. Analyze the conversation and extract the main educational topic being discussed.
Return ONLY a JSON object with this format:
{"topic": "the main topic", "subtopics": ["subtopic1", "subtopic2"]}

If no clear educational topic is found, return:
{"topic": null, "subtopics": []}

Only return the JSON, no other text.`;
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
        stream: shouldStream,
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

    if (shouldStream) {
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
