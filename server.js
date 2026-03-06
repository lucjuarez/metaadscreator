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

// Versión del "Santo Grial" (v25.0)
const META_VERSION = 'v25.0';

// ============================================================================
// ENDPOINT 1 y 2 (Generación IA y DALL-E) se mantienen igual...
// ============================================================================

// [AQUÍ IRÍAN TUS ENDPOINTS DE GENERACIÓN DE ESTRATEGIA E IMAGEN]

// ============================================================================
// ENDPOINT 3: CREAR CAMPAÑA (ACTUALIZADO v25.0)
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
        objective: objective,
        status: "PAUSED",
        special_ad_categories: [], 
        access_token: ACCESS_TOKEN
      })
    });

    const metaData = await metaResponse.json();
    if (metaData.error) return res.status(400).json({ error: metaData.error.message });

    res.json({ success: true, campaign_id: metaData.id });
  } catch (error) {
    res.status(500).json({ error: "Error al conectar con Meta v25.0" });
  }
});

// ============================================================================
// NUEVO ENDPOINT: CREAR AD SET (CONJUNTO DE ANUNCIOS)
// ============================================================================
app.post('/api/create-adset', async (req, res) => {
  try {
    const { 
      campaignId, 
      adSetName, 
      budget, 
      audience, 
      userAccessToken, 
      userAccountId 
    } = req.body;

    const ACCESS_TOKEN = userAccessToken || process.env.META_ACCESS_TOKEN;
    const AD_ACCOUNT_ID = userAccountId || process.env.META_AD_ACCOUNT_ID;

    // Construimos la segmentación según el documento técnico
    const targeting = {
      geo_locations: { countries: ['AR'] }, // Ajustable según IA
      age_min: audience.age_min || 18,
      age_max: audience.age_max || 65,
      publisher_platforms: ['facebook', 'instagram', 'messenger']
    };

    const metaResponse = await fetch(`https://graph.facebook.com/${META_VERSION}/${AD_ACCOUNT_ID}/adsets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: adSetName,
        campaign_id: campaignId,
        daily_budget: budget * 100, // Meta usa centavos (ej: 3000 ARS = 300000)
        billing_event: "IMPRESSIONS",
        optimization_goal: "REACH", // Ajustable según objetivo
        targeting: targeting,
        status: "PAUSED",
        access_token: ACCESS_TOKEN
      })
    });

    const metaData = await metaResponse.json();
    if (metaData.error) return res.status(400).json({ error: metaData.error.message });

    res.json({ success: true, adset_id: metaData.id });
  } catch (error) {
    res.status(500).json({ error: "Error al crear Ad Set en v25.0" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Ads Creator v25.0 en puerto ${PORT}`));
