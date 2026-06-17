import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Gemini API endpoint
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent";
const GEMINI_API_URL_NON_STREAM = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

// Retry helper with exponential backoff
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
  timeoutMs = 30000
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Don't retry on client errors (4xx) except 429
      if (response.ok || (response.status >= 400 && response.status < 500 && response.status !== 429)) {
        return response;
      }

      // Retry on 429 or 5xx
      if (attempt < maxRetries - 1 && (response.status === 429 || response.status >= 500)) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  throw lastError || new Error("Request failed after retries");
}

// Convert OpenAI-style messages to Gemini format
function convertToGeminiFormat(systemPrompt: string, messages: any[]) {
  const contents: any[] = [];

  // Add system instruction as first user message context
  if (systemPrompt) {
    contents.push({
      role: "user",
      parts: [{ text: `System Instructions: ${systemPrompt}\n\nNow respond to the following conversation:` }]
    });
    contents.push({
      role: "model",
      parts: [{ text: "Understood. I will follow those instructions." }]
    });
  }

  for (const msg of messages) {
    const role = msg.role === "assistant" ? "model" : "user";

    // Handle multimodal content (images)
    if (Array.isArray(msg.content)) {
      const parts: any[] = [];
      for (const item of msg.content) {
        if (item.type === "text") {
          parts.push({ text: item.text });
        } else if (item.type === "image_url" && item.image_url?.url) {
          // Extract base64 data from data URL
          const dataUrl = item.image_url.url;
          if (dataUrl.startsWith("data:")) {
            const [header, base64Data] = dataUrl.split(",");
            const mimeType = header.split(":")[1]?.split(";")[0] || "image/jpeg";
            parts.push({
              inline_data: {
                mime_type: mimeType,
                data: base64Data
              }
            });
          }
        }
      }
      contents.push({ role, parts });
    } else {
      contents.push({
        role,
        parts: [{ text: msg.content }]
      });
    }
  }

  return contents;
}

// Parse Gemini SSE stream to OpenAI-compatible format
function createStreamTransformer() {
  return new TransformStream({
    transform(chunk, controller) {
      try {
        const text = new TextDecoder().decode(chunk);
        const lines = text.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            // Gemini sends JSON directly, not SSE format
            const data = JSON.parse(line.replace(/^data:\s*/, ''));

            if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
              const content = data.candidates[0].content.parts[0].text;
              // Convert to OpenAI SSE format
              const openAIFormat = {
                choices: [{
                  delta: { content }
                }]
              };
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(openAIFormat)}\n\n`));
            }
          } catch {
            // Try parsing as array (Gemini sometimes sends array chunks)
            try {
              const parsed = JSON.parse(line);
              if (Array.isArray(parsed)) {
                for (const item of parsed) {
                  if (item.candidates?.[0]?.content?.parts?.[0]?.text) {
                    const content = item.candidates[0].content.parts[0].text;
                    const openAIFormat = {
                      choices: [{
                        delta: { content }
                      }]
                    };
                    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(openAIFormat)}\n\n`));
                  }
                }
              }
            } catch {
              // Skip unparseable lines
            }
          }
        }
      } catch {
        // Skip errors in stream processing
      }
    },
    flush(controller) {
      controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
    }
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, type = "chat", imageData, topic, difficulty, questionCount, studiedTopics, weakTopics, context, mode, subject } = await req.json();

    // Try GEMINI_API_KEY first, then fall back to LOVABLE_API_KEY for backward compatibility
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!GEMINI_API_KEY && !LOVABLE_API_KEY) {
      throw new Error("No API key configured. Please set GEMINI_API_KEY in Supabase secrets.");
    }

    // If using Lovable API key, use the old gateway (backward compatibility)
    if (!GEMINI_API_KEY && LOVABLE_API_KEY) {
      return await handleLovableGateway(req, messages, type, imageData, topic, difficulty, questionCount, studiedTopics, weakTopics, context, mode, subject, LOVABLE_API_KEY);
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
    } else if (type === "doubt_mode") {
      shouldStream = true;

      let contextInfo = "";
      if (studiedTopics && studiedTopics.length > 0) {
        contextInfo += `\nTopics the student has studied: ${studiedTopics.join(", ")}.`;
      }
      if (weakTopics && weakTopics.length > 0) {
        contextInfo += `\nTopics the student needs more practice with: ${weakTopics.join(", ")}.`;
      }

      const subjectContext: Record<string, string> = {
        general: "You are a general tutor covering all subjects.",
        math: "You are a mathematics expert. Use proper mathematical notation, show step-by-step solutions, and explain the underlying principles.",
        dsa: "You are a data structures and algorithms expert. Explain time/space complexity, provide pseudocode when helpful, and relate to practical applications.",
        electronics: "You are an electronics engineering expert. Use circuit diagrams descriptions, explain with analogies, and cover both analog and digital concepts.",
        dbms: "You are a database management systems expert. Cover SQL queries, normalization, transactions, and explain with real-world database examples.",
        os: "You are an operating systems expert. Explain processes, memory management, scheduling algorithms, and use diagrams in text when helpful."
      };

      const modePrompts: Record<string, string> = {
        standard: `You are StudyBuddy AI, a friendly and knowledgeable study companion.
Provide balanced explanations that are thorough but accessible.
${subjectContext[subject] || subjectContext.general}
${contextInfo}
Use examples when helpful and encourage learning.`,

        eli10: `You are StudyBuddy AI in "Explain Like I'm 10" mode.
${subjectContext[subject] || subjectContext.general}
${contextInfo}

IMPORTANT GUIDELINES:
- Use simple language a 10-year-old would understand
- Use fun, relatable analogies (games, toys, everyday objects)
- Avoid jargon; if you must use technical terms, define them simply
- Keep explanations short and engaging
- Use emojis occasionally to make it fun 🎮📚`,

        exam: `You are StudyBuddy AI in Exam Preparation mode.
${subjectContext[subject] || subjectContext.general}
${contextInfo}

IMPORTANT GUIDELINES:
- Focus on exam-relevant content and common question patterns
- Structure answers like model exam answers
- Highlight key points that are frequently tested
- Mention common mistakes students make
- Provide tips for remembering important formulas/concepts
- Include "Remember for exam:" sections`,

        revision: `You are StudyBuddy AI in Quick Revision mode.
${subjectContext[subject] || subjectContext.general}
${contextInfo}

IMPORTANT GUIDELINES:
- Provide ultra-concise summaries (one-page max)
- Use bullet points extensively
- Create easy mnemonics when possible
- Highlight the MOST important 20% of content
- Format for quick scanning before an exam
- Include a "Quick Recall" section at the end`
      };

      systemPrompt = modePrompts[mode] || modePrompts.standard;
    } else if (type === "study_plan") {
      shouldStream = false;
      systemPrompt = `You are StudyBuddy AI, an expert study planner. Generate a personalized study plan.

Return a JSON object with this format:
{
  "plan_overview": "Brief 1-2 sentence description of the plan",
  "daily_hours_recommended": 2,
  "tasks": [
    {
      "title": "Task title",
      "description": "What to do",
      "day": 1,
      "duration_minutes": 45,
      "task_type": "learn|practice|revise|test",
      "topic": "Specific topic",
      "priority": 1
    }
  ],
  "milestones": ["After 1 week: Complete basics", "After 2 weeks: Practice problems"],
  "tips": ["Start with fundamentals", "Practice daily"]
}

Create a realistic, achievable plan. Return ONLY valid JSON.`;
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
    } else if (type === "pdf_recommend") {
      shouldStream = false;
      systemPrompt = `You are an educational resource curator. For the given topic, recommend high-quality, FREE educational PDFs and resources.

Return a JSON array with this format:
[{
  "title": "Resource title",
  "source": "NPTEL/MIT OCW/Khan Academy/Textbook Publisher/University",
  "url": "https://...",
  "description": "Brief description of what it covers",
  "quality_score": 1-5,
  "level": "beginner/intermediate/advanced"
}]

IMPORTANT:
- Only recommend resources from trusted, legal sources
- Prefer: NPTEL (nptel.ac.in), MIT OpenCourseWare, Khan Academy, official university sites
- Include direct links when possible
- Rate quality based on content depth and production quality
- Return 3-5 recommendations

Only return the JSON array, no other text.`;
      userMessages = [{ role: "user", content: `Recommend free, high-quality PDF resources and study materials for: ${topic}` }];
    } else if (type === "mock_test") {
      shouldStream = false;
      const count = questionCount || 10;
      const types = context?.questionTypes || ["mcq"];

      systemPrompt = `You are an expert exam question creator. Generate a comprehensive mock test.

Return a JSON object with this format:
{
  "title": "Test title",
  "questions": [
    {
      "id": 1,
      "type": "mcq",
      "question": "Question text",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "Why this is correct",
      "marks": 2,
      "difficulty": "easy|medium|hard"
    },
    {
      "id": 2,
      "type": "descriptive",
      "question": "Explain...",
      "expected_points": ["Point 1", "Point 2", "Point 3"],
      "model_answer": "Detailed model answer",
      "marks": 5,
      "difficulty": "medium"
    },
    {
      "id": 3,
      "type": "coding",
      "question": "Write a function that...",
      "test_cases": [
        {"input": "example input", "expected_output": "example output"}
      ],
      "hints": ["Hint 1"],
      "model_solution": "def solution()...",
      "marks": 10,
      "difficulty": "hard"
    }
  ],
  "total_marks": 100,
  "duration_minutes": 60
}

Include question types: ${types.join(", ")}
Generate exactly ${count} questions.
Subject: ${topic}
Difficulty: ${difficulty}

Only return the JSON object, no other text.`;
      userMessages = [{ role: "user", content: `Generate a mock test with ${count} questions about ${topic} at ${difficulty} level` }];
    } else if (type === "doc_summary") {
      shouldStream = false;
      systemPrompt = `You are an expert document analyzer. Analyze the provided text and create a structured summary.

Return a JSON object with this format:
{
  "title": "Inferred document title",
  "summary": "2-3 sentence overview",
  "key_points": [
    {"heading": "Section 1", "points": ["Point 1", "Point 2"]},
    {"heading": "Section 2", "points": ["Point 1", "Point 2"]}
  ],
  "important_terms": [
    {"term": "Term 1", "definition": "Definition"}
  ],
  "study_questions": [
    "Question 1?",
    "Question 2?"
  ],
  "difficulty_level": "beginner|intermediate|advanced",
  "estimated_read_time_minutes": 10
}

Make the summary structured and scannable. Focus on key concepts.
Only return the JSON object, no other text.`;
    } else if (type === "code_run") {
      shouldStream = false;
      const language = context?.language || "python";
      const code = context?.code || "";
      const testCases = context?.testCases || [];

      systemPrompt = `You are a code execution simulator and analyzer. Analyze the following ${language} code and simulate its execution.

Return a JSON object with this format:
{
  "syntax_valid": true/false,
  "syntax_error": "Error message if any",
  "test_results": [
    {
      "input": "test input",
      "expected_output": "expected",
      "actual_output": "what the code would produce",
      "passed": true/false
    }
  ],
  "all_passed": true/false,
  "time_complexity": "O(n)",
  "space_complexity": "O(1)",
  "suggestions": ["Improvement 1", "Improvement 2"],
  "explanation": "Brief explanation of what the code does"
}

Code to analyze:
\`\`\`${language}
${code}
\`\`\`

Test cases: ${JSON.stringify(testCases)}

Only return the JSON object, no other text.`;
      userMessages = [{ role: "user", content: `Analyze and simulate this ${language} code` }];
    } else if (type === "code_hint") {
      shouldStream = true;
      systemPrompt = `You are a helpful coding tutor. Provide a HINT for the problem, NOT the full solution.

Guidelines:
- Give a nudge in the right direction
- Mention the key data structure or algorithm to consider
- Do NOT write the actual code
- Be encouraging and Socratic

Keep hints brief (2-3 sentences max).`;
    }

    // Call Gemini API directly
    const geminiContents = convertToGeminiFormat(systemPrompt, userMessages);
    const apiUrl = shouldStream
      ? `${GEMINI_API_URL}?key=${GEMINI_API_KEY}&alt=sse`
      : `${GEMINI_API_URL_NON_STREAM}?key=${GEMINI_API_KEY}`;

    const response = await fetchWithRetry(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: geminiContents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
        ]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 400) {
        return new Response(JSON.stringify({ error: "Invalid request. Please check your API key." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI service error. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (shouldStream && response.body) {
      // Transform Gemini stream to OpenAI-compatible format
      const transformedStream = response.body.pipeThrough(createStreamTransformer());
      return new Response(transformedStream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    } else {
      // Non-streaming response
      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      // Return in OpenAI-compatible format
      return new Response(JSON.stringify({
        choices: [{
          message: {
            role: "assistant",
            content: content
          }
        }]
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Chat function error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Backward compatibility: Use Lovable gateway if only LOVABLE_API_KEY is set
async function handleLovableGateway(
  req: Request,
  messages: any[],
  type: string,
  imageData: string | undefined,
  topic: string | undefined,
  difficulty: string | undefined,
  questionCount: number | undefined,
  studiedTopics: string[] | undefined,
  weakTopics: string[] | undefined,
  context: any,
  mode: string | undefined,
  subject: string | undefined,
  LOVABLE_API_KEY: string
) {
  // This is the original Lovable gateway implementation
  let systemPrompt = "";
  let userMessages = messages;
  let shouldStream = type === "chat" || type === "doubt_mode" || type === "learn" || type === "code_hint";

  // Generate appropriate system prompt based on type (same logic as above)
  if (type === "chat") {
    systemPrompt = "You are StudyBuddy AI, a friendly study companion.";
  } else {
    systemPrompt = "You are StudyBuddy AI.";
  }

  const response = await fetchWithRetry("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-1.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        ...userMessages,
      ],
      stream: shouldStream,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Lovable gateway error:", response.status, errorText);
    return new Response(JSON.stringify({ error: "AI service error." }), {
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
}
