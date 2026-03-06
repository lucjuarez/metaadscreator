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

const SYSTEM_PROMPT = `
Eres un Media Buyer Senior y Copywriter de respuesta directa experto en Meta Ads.
Tu trabajo es analizar la información de un negocio y crear una estrategia y 3 variantes de anuncios enfocados en conversión.

Reglas de Copywriting:

primary_text: Fórmula AIDA, máximo 3 párrafos cortos.

headline: Directo, máximo 5 palabras.

text_for_image: Máximo 6 palabras, diseñado para llamar la atención haciendo scroll.

image_generation_prompt: EN INGLÉS. Describe la escena fotográfica o diseño. MUY IMPORTANTE: Especifica que debe haber "completely empty negative space" (espacio vacío) para superponer texto después.

REGLA CRÍTICA DE FORMATO:
Debes responder ÚNICAMENTE con un objeto JSON válido.
Estructura exacta:
{
"campaign": { "objective": "", "daily_budget": 0 },
"ad_set": { "audience": { "age_min": 0, "age_max": 0, "locations": [], "interests": [] } },
"ads": [
{ "ad_name": "", "primary_text": "", "headline": "", "image_generation_prompt": "", "text_for_image": "" }
]
}
`;

app.post('/api/generate-campaign', async (req, res) => {
try {
const { businessContext } = req.body;

} catch (error) {
console.error("Error:", error);
res.status(500).json({ error: "Ocurrió un error al procesar la estrategia." });
}
});

app.post('/api/generate-creative', async (req, res) => {
try {
const { imagePrompt, imageText } = req.body;

} catch (error) {
console.error("Error:", error);
res.status(500).json({ error: "Ocurrió un error al generar el creativo." });
}
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
console.log("Servidor corriendo en el puerto: " + PORT);
});