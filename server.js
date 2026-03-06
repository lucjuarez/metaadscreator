import express from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Prompt mejorado para que GPT actúe como Director de Arte y Media Buyer
const SYSTEM_PROMPT = `
Eres Luciano Juárez, Media Buyer Senior y Director de Arte experto en Meta Ads. 
Tu objetivo es crear una estrategia de anuncios de alta conversión.

Para cada anuncio, debes diseñar una descripción visual detallada (image_generation_prompt) 
que sea fotorrealista, profesional y que deje espacio vacío (negative space) para texto.

REGLA CRÍTICA DE FORMATO:
Responde ÚNICAMENTE con un objeto JSON válido.
{ 
  "campaign": { "objective": "", "daily_budget": 0 }, 
  "ad_set": { "audience": { "age_min": 0, "age_max": 0, "interests": [] } }, 
  "ads": [ 
    { 
      "ad_name": "Nombre del Ad",
      "primary_text": "Cuerpo del mensaje (Fórmula AIDA)",
      "headline": "Título gancho",
      "image_description_ai": "Descripción ultra-detallada de la imagen para que la IA la cree",
      "text_for_image": "Frase corta para la imagen"
    } 
  ] 
}
`;

app.post('/api/generate-campaign', async (req, res) => {
  try {
    const { businessContext } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // El "cerebro" que coordina todo
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Negocio: ${businessContext}` }
      ]
    });

    res.json(JSON.parse(response.choices[0].message.content));
  } catch (error) {
    res.status(500).json({ error: "Error al generar con GPT" });
  }
});

// Mantenemos este endpoint pero ahora es activado por el diseño de GPT
app.post('/api/generate-creative', async (req, res) => {
  try {
    const { imagePrompt, imageText } = req.body;

    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: `Professional advertisement photography: ${imagePrompt}. High resolution, clean composition. Leave space for text: ${imageText}`,
      n: 1,
      size: "1024x1024",
    });

    res.json({ final_creative_url: imageResponse.data[0].url });
  } catch (error) {
    res.status(500).json({ error: "Error al crear la imagen" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Ads Creator Lite en puerto ${PORT}`));
