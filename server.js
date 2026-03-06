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

// Versión del "Santo Grial" según tu documento
const META_VERSION = 'v25.0';

// ============================================================================
// ENDPOINTS DE IA (Se mantienen igual para no romper tu lógica de generación)
// ============================================================================

app.post('/api/generate-campaign', async (req, res) => {
  try {
    const { businessContext } = req.body;
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.7,
      messages: [
        { role: "system", content: "Eres un Media Buyer experto. Responde solo en JSON." },
        { role: "user", content: `Contexto: ${businessContext}` }
      ]
    });
    res.json(JSON.parse(response.choices[0].message.content));
  } catch (error) { res.status(500).json({ error: "Error en IA" }); }
});

app.post('/api/generate-creative', async (req, res) => {
  try {
    const { imagePrompt, imageText } = req.body;
    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: imagePrompt + ". Text to include: " + imageText,
      n: 1, size: "1024x1024",
    });
    res.json({ final_creative_url: imageResponse.data[0].url });
  } catch (error) { res.status(500).json({ error: "Error en DALL-E" }); }
});

// ============================================================================
// ENDPOINT 3: CREAR CAMPAÑA (v25.0)
// ============================================================================
app.post('/api/publish-campaign', async (req, res) => {
  try {
    const { campaignName, objective, userAccessToken, userAccountId } = req.body;
    const ACCESS_TOKEN = userAccessToken || process.env.META_ACCESS_TOKEN;
    const AD_ACCOUNT_ID = userAccountId || process.env.META_AD_ACCOUNT_ID;

    const metaResponse = await fetch(`https://graph.facebook.com/${META_VERSION}/${AD_ACCOUNT_ID}/campaigns`, {
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
    if (metaData.error) {
        console.error("❌ Error Campaña:", metaData.error);
        return res.status(400).json({ error: metaData.error.message });
    }
    res.json({ success: true, campaign_id: metaData.id });
  } catch (error) { res.status(500).json({ error: "Fallo total en Campaña" }); }
});

// ============================================================================
// ENDPOINT 4: CREAR AD SET (MÁXIMA COMPATIBILIDAD v25.0)
// ============================================================================
app.post('/api/create-adset', async (req, res) => {
  try {
    const { campaignId, adSetName, budget, audience, userAccessToken, userAccountId } = req.body;
    const ACCESS_TOKEN = userAccessToken || process.env.META_ACCESS_TOKEN;
    const AD_ACCOUNT_ID = userAccountId || process.env.META_AD_ACCOUNT_ID;

    // Conversión a centavos: 3000 ARS -> 300000
    const dailyBudget = Math.max(parseInt(budget), 1000) * 100;

    const adSetData = {
      name: adSetName,
      campaign_id: campaignId,
      daily_budget: dailyBudget,
      billing_event: "IMPRESSIONS",
      optimization_goal: "REACH", // REACH es el más "seguro" para evitar errores de objetivo
      status: "PAUSED",
      targeting: {
        geo_locations: { countries: ['AR'] },
        age_min: parseInt(audience.age_min) || 18,
        age_max: parseInt(audience.age_max) || 65
      },
      access_token: ACCESS_TOKEN
    };

    const metaResponse = await fetch(`https://graph.facebook.com/${META_VERSION}/${AD_ACCOUNT_ID}/adsets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adSetData)
    });

    const metaData = await metaResponse.json();

    if (metaData.error) {
      console.error("❌ Error AdSet Meta:", JSON.stringify(metaData.error));
      return res.status(400).json({ error: metaData.error.message });
    }

    res.json({ success: true, adset_id: metaData.id });
  } catch (error) {
    console.error("❌ Error AdSet Servidor:", error);
    res.status(500).json({ error: "Error interno al crear Ad Set" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Ads Creator v25.0 Full Live`));
