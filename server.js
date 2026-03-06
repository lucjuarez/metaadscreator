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

// PROMPT MAESTRO PARA QUE GPT DISEÑE TODO
const SYSTEM_PROMPT = `
Eres Luciano Juárez, Media Buyer Senior y Director de Arte experto en Meta Ads. 
Tu objetivo es analizar un negocio y crear una estrategia de anuncios de alta conversión.

Instrucciones para la IMAGEN:
Para cada anuncio, debes crear una 'image_description_ai' en INGLÉS. 
Debe ser una descripción de fotografía publicitaria profesional, fotorrealista, de alta resolución y, MUY IMPORTANTE, debe especificar que debe haber 'negative space' (espacio vacío) para superponer texto después sin tapar el producto o sujeto.

REGLA CRÍTICA DE FORMATO:
Responde ÚNICAMENTE con un objeto JSON válido.
{ 
  "campaign": { "objective": "", "daily_budget": 0 }, 
  "ad_set": { "audience": { "age_min": 0, "age_max": 0, "interests": [] } }, 
  "ads": [ 
    { 
      "ad_name": "Nombre Interno",
      "primary_text": "Cuerpo del mensaje (Fórmula AIDA)",
      "headline": "Título llamativo",
      "image_description_ai": "Descripción detallada para la generación de imagen",
      "text_for_image": "Texto corto que irá en la imagen"
    } 
  ] 
}
`;

// ENDPOINT 1: GPT GENERA LA ESTRATEGIA Y EL DISEÑO VISUAL
app.post('/api/generate-campaign', async (req, res) => {
  try {
    const { businessContext } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Contexto del Negocio: ${businessContext}` }
      ]
    });

    res.json(JSON.parse(response.choices[0].message.content));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error en la generación de estrategia" });
  }
});

// ENDPOINT 2: DALL-E 3 EJECUTA EL DISEÑO DE GPT
app.post('/api/generate-creative', async (req, res) => {
  try {
    const { imagePrompt, imageText } = req.body;

    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: `Advertising photography, high quality: ${imagePrompt}. The scene should have solid negative space to overlay the text: '${imageText}'. Professional lighting.`,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    res.json({ final_creative_url: imageResponse.data[0].url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al generar la pieza visual" });
  }
});

// ENDPOINT 3: PUBLICAR EN META (v19.0 - Versión estable de prueba)
app.post('/api/publish-campaign', async (req, res) => {
  try {
    const { campaignName, objective } = req.body;
    const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
    const AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID;

    const metaResponse = await fetch(`https://graph.facebook.com/v19.0/${AD_ACCOUNT_ID}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: campaignName,
        objective: objective || "OUTCOME_LEADS",
        status: "PAUSED",
        special_ad_categories: [],
        access_token: ACCESS_TOKEN
      })
    });

    const metaData = await metaResponse.json();
    if (metaData.error) return res.status(400).json({ error: metaData.error.message });
    res.json({ success: true, campaign_id: metaData.id });
  } catch (error) {
    res.status(500).json({ error: "Fallo en la conexión con Meta" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Ads Creator unificado en puerto ${PORT}`));
