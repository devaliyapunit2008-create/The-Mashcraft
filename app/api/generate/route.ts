import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc, Timestamp } from "firebase/firestore";
import { awardXP } from "@/lib/gamification";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: `SYSTEM_INSTRUCTION:
You are the DevStory Engine, a Cyberpunk AI Architect. Analyze the GitHub repository or User Idea and return a STRICT JSON object.
Your goal is to "Productize" the hackathon idea into a winning package.

JSON STRUCTURE:
{
  "project_name": "Inferred Name (Cool, catchy)",
  "tagline": "A punchy one-liner (Marketing style)",
  "story": {
      "problem": "The painful problem statement",
      "solution": "The innovative solution",
      "tech": "The specific stack (e.g. Next.js, Firebase...)"
  },
  "diagram": "Mermaid.js graph TD string visualizing the architecture. NODES SHOULD BE SHORT. DO NOT USE MARKDOWN BLOCK.",
  "game_quests": [
      { "title": "Deploy MVP", "instruction": "Ship to Vercel", "xp": 200 },
      { "title": "Record Demo", "instruction": "60s video", "xp": 100 },
      { "title": "Design UI", "instruction": "Figma mockup", "xp": 150 }
  ],
  "demo_script": [
      { "time": "0:00", "action": "Intro", "script": "High energy intro..." },
      { "time": "0:15", "action": "Problem", "script": "Show the struggle..." }
  ],
  "cheat_sheet": {
    "innovation_score": 95,
    "why_it_wins": ["Uses AI for real-time collaboration.", "Gamified workflow boosts retention.", "Cyberpunk aesthetic reduces fatigue."]
  },
  "pitch_script": [
    { "time": "00:00", "text": "Hook: 30s intro..." },
    { "time": "00:30", "text": "Problem: 30s deep dive..." },
    { "time": "01:00", "text": "Solution: 30s reveal..." },
    { "time": "01:30", "text": "Call to Action: 30s close..." }
  ]
}
`,
    generationConfig: { responseMimeType: "application/json" }
});

export async function POST(req: Request) {
    try {
        const { userId, userContext, teamId } = await req.json();

        if (!userId || !userContext) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        // Determine Collection Path
        let collectionRef;
        if (teamId) {
            collectionRef = collection(db, "teams", teamId, "projects");
        } else {
            collectionRef = collection(db, "users", userId, "projects");
        }

        // 1. Create Document
        const docRef = await addDoc(collectionRef, {
            inputContext: userContext,
            userId: userId,
            status: "generating",
            createdAt: Timestamp.now(),
            output: null
        });

        const prompt = `Input Context: ${userContext}`;

        try {
            // 2. Generate Content
            const result = await model.generateContent(prompt);
            const responseText = result.response.text();
            let jsonOutput;

            try {
                jsonOutput = JSON.parse(responseText);
            } catch (e) {
                // Fallback cleanup if markdown is present
                const cleanText = responseText.replace(/```json/g, "").replace(/```/g, "");
                jsonOutput = JSON.parse(cleanText);
            }

            // 3. Update Document
            const finalDocRef = doc(collectionRef, docRef.id);
            await updateDoc(finalDocRef, {
                status: "completed",
                output: jsonOutput
            });

            // 4. Award XP (Gamification)
            if (teamId) {
                await awardXP(userId, teamId, "GENERATE_PROJECT");
            }

            return NextResponse.json({ success: true, id: docRef.id });

        } catch (aiError) {
            console.error("AI Generation Error:", aiError);
            const finalDocRef = doc(collectionRef, docRef.id);
            await updateDoc(finalDocRef, {
                status: "error",
            });
            return NextResponse.json({ error: "AI Generation Failed" }, { status: 500 });
        }

    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
