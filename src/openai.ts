import { Configuration, OpenAIApi } from "openai";
import { Weekday } from "./lunchMenu";
import dotenv from "dotenv";

dotenv.config();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Define the type for menu items
export type MenuItem = {
  name: string;
  description?: string;
  price?: number;
};
export async function parseMenuWithChatGPT(
  htmlContent: string,
  weekday: Weekday
): Promise<MenuItem[]> {
  const maxAttempts = 5;
  let attempt = 0;
  let error: Error | null = null;

  while (attempt < maxAttempts) {
    try {
      const result = await tryParseMenuWithChatGPT(htmlContent, weekday);
      return result;
    } catch (err) {
      error = err as Error;
      console.warn(`Attempt ${attempt + 1} failed: ${error.message}`);
      attempt++;
    }
  }

  throw new Error(`Failed to parse menu after ${maxAttempts} attempts: ${error?.message}`);
}

export async function tryParseMenuWithChatGPT(
  htmlContent: string,
  weekday: Weekday
): Promise<MenuItem[]> {
  const prompt = `Here's a html page describing the lunch menu for this week. What's today's lunch offering? Today is ${weekday}. Names and descriptions should be in Finnish language`;
  const formatPrompt = `Answer in json using this schema:
{
    "type": "array",
    "items": {
        "type": "object",
        "properties": {
            "name": {
                "type": "string"
            },
            "description": {
                "type": "string"
            },
            "price": {
                "type": "number"
            }
        },
        "required": [
            "name"
        ]
    }
}`;
  try {
    const response = await openai.createChatCompletion({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that parses HTML content and extracts lunch menu information.",
        },
        { role: "system", content: formatPrompt },
        { role: "user", content: prompt },
        { role: "user", content: htmlContent },
      ],
    });

    // Parse the JSON response
    const content = response.data.choices[0].message?.content ?? "[]";
    const jsonContent = content.replace(/^```json\n/, "").replace(/\n```$/, "");
    const parsedResponse: MenuItem[] = JSON.parse(jsonContent);

    // Validate the parsed response against the schema
    const validateResponse = (items: MenuItem[]): boolean => {
      return items.every(
        (item) =>
          typeof item === "object" &&
          typeof item.name === "string" &&
          (item.description === undefined ||
            typeof item.description === "string") &&
          (item.price === undefined || typeof item.price === "number")
      );
    };

    if (!Array.isArray(parsedResponse) || !validateResponse(parsedResponse)) {
      throw new Error("Invalid response format from ChatGPT: " +parsedResponse);
    }

    return parsedResponse;
  } catch (error) {
    console.error("Error parsing menu with ChatGPT:", error);
    throw error;
  }
}
