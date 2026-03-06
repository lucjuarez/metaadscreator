app.post('/api/create-adset', async (req, res) => {
  try {
    const { campaignId, adSetName, budget, audience, userAccessToken, userAccountId } = req.body;
    const ACCESS_TOKEN = userAccessToken || process.env.META_ACCESS_TOKEN;
    const AD_ACCOUNT_ID = userAccountId || process.env.META_AD_ACCOUNT_ID;

    // Ajuste de presupuesto: Meta v25.0 usa centavos. 
    // Si pones 3000 ARS, enviamos 300000.
    const finalBudget = Math.max(budget, 1000) * 100; 

    console.log(`📡 Intentando crear Ad Set en ${AD_ACCOUNT_ID}...`);

    const metaResponse = await fetch(`https://graph.facebook.com/${META_VERSION}/${AD_ACCOUNT_ID}/adsets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: adSetName,
        campaign_id: campaignId,
        daily_budget: finalBudget,
        billing_event: "IMPRESSIONS",
        optimization_goal: "IMPRESSIONS", // Cambiado a IMPRESSIONS por ser el más compatible con todos los objetivos
        bid_strategy: "LOWEST_COST_WITHOUT_CAP",
        targeting: {
          geo_locations: { countries: ['AR'] },
          age_min: audience.age_min || 18,
          age_max: audience.age_max || 65,
          publisher_platforms: ['facebook', 'instagram']
        },
        status: "PAUSED",
        access_token: ACCESS_TOKEN
      })
    });

    const metaData = await metaResponse.json();
    
    if (metaData.error) {
      console.error("❌ Error Detallado de Meta:", JSON.stringify(metaData.error));
      return res.status(400).json({ 
        error: metaData.error.message,
        type: metaData.error.type,
        code: metaData.error.code 
      });
    }

    res.json({ success: true, adset_id: metaData.id });
  } catch (error) {
    console.error("❌ Error Servidor:", error);
    res.status(500).json({ error: "Fallo de conexión con el servidor de Meta." });
  }
});
