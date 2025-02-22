import { OpenAI } from 'openai';

export const analyzeProperty = async (propertyData: PropertyData) => {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  const analysis = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "Analyze this property listing and provide: 1. Main pros and cons 2. Market analysis 3. Investment potential"
      },
      {
        role: "user",
        content: JSON.stringify(propertyData)
      }
    ]
  });

  return analysis.choices[0].message.content;
}; 