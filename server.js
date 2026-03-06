import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import axios from "axios"
import OpenAI from "openai"
import FormData from "form-data"

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 3000

const META_VERSION = "v25.0"

const openai = new OpenAI({
 apiKey: process.env.OPENAI_API_KEY
})

/* ---------------------------
AI STRATEGY
--------------------------- */

async function generateStrategy(business) {

 const prompt = `
Eres un experto en Meta Ads.

Analiza este negocio y genera una estrategia publicitaria.

Negocio:
${business}

Devuelve JSON:

{
 objective:"",
 budget:3000,
 interests:["","",""],
 ads:[
  {
   hook:"",
   text:"",
   headline:"",
   image_prompt:""
  },
  {
   hook:"",
   text:"",
   headline:"",
   image_prompt:""
  },
  {
   hook:"",
   text:"",
   headline:"",
   image_prompt:""
  }
 ]
}
`

 const response = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [
   { role: "user", content: prompt }
  ]
 })

 return JSON.parse(response.choices[0].message.content)
}

/* ---------------------------
GENERATE IMAGE
--------------------------- */

async function generateImage(prompt){

 const img = await openai.images.generate({
  model: "dall-e-3",
  prompt: prompt,
  size: "1024x1024"
 })

 return img.data[0].url
}

/* ---------------------------
UPLOAD IMAGE META
--------------------------- */

async function uploadImage(adAccountId,imageUrl,token){

 const image = await axios.get(imageUrl,{responseType:"arraybuffer"})

 const form = new FormData()

 form.append("file",Buffer.from(image.data),"creative.png")

 const res = await axios.post(

  `https://graph.facebook.com/${META_VERSION}/act_${adAccountId}/adimages`,
  form,
  {
   headers:{
    ...form.getHeaders()
   },
   params:{
    access_token:token
   }
  }
 )

 const hash = Object.values(res.data.images)[0].hash

 return hash
}

/* ---------------------------
CREATE CAMPAIGN
--------------------------- */

async function createCampaign(adAccountId,objective,token){

 const res = await axios.post(

  `https://graph.facebook.com/${META_VERSION}/act_${adAccountId}/campaigns`,
  {
   name:"AI Campaign",
   objective:objective,
   status:"PAUSED"
  },
  {
   params:{access_token:token}
  }
 )

 return res.data.id
}

/* ---------------------------
CREATE ADSET
--------------------------- */

async function createAdset(adAccountId,campaignId,budget,interests,token){

 const res = await axios.post(

  `https://graph.facebook.com/${META_VERSION}/act_${adAccountId}/adsets`,
  {
   name:"AI Adset",
   campaign_id:campaignId,
   daily_budget:budget*100,
   billing_event:"IMPRESSIONS",
   optimization_goal:"LINK_CLICKS",
   bid_strategy:"LOWEST_COST_WITHOUT_CAP",
   targeting:{
    geo_locations:{countries:["AR"]},
    age_min:21,
    age_max:55,
    interests:interests.map(i=>({name:i}))
   },
   status:"PAUSED"
  },
  {
   params:{access_token:token}
  }
 )

 return res.data.id
}

/* ---------------------------
CREATE CREATIVE
--------------------------- */

async function createCreative(adAccountId,pageId,hash,ad,token){

 const res = await axios.post(

  `https://graph.facebook.com/${META_VERSION}/act_${adAccountId}/adcreatives`,
  {
   name:"AI Creative",
   object_story_spec:{
    page_id:pageId,
    link_data:{
     message:ad.text,
     name:ad.headline,
     image_hash:hash,
     link:"https://www.tusitio.com",
     call_to_action:{
      type:"SHOP_NOW"
     }
    }
   }
  },
  {
   params:{access_token:token}
  }
 )

 return res.data.id
}

/* ---------------------------
CREATE AD
--------------------------- */

async function createAd(adAccountId,adsetId,creativeId,token){

 const res = await axios.post(

  `https://graph.facebook.com/${META_VERSION}/act_${adAccountId}/ads`,
  {
   name:"AI Ad",
   adset_id:adsetId,
   creative:{creative_id:creativeId},
   status:"PAUSED"
  },
  {
   params:{access_token:token}
  }
 )

 return res.data.id
}

/* ---------------------------
MAIN ROUTE
--------------------------- */

app.post("/create-campaign",async(req,res)=>{

 try{

  const {business,adAccountId,pageId,token}=req.body

  /* STEP 1 AI STRATEGY */

  const strategy = await generateStrategy(business)

  /* STEP 2 CAMPAIGN */

  const campaignId = await createCampaign(
   adAccountId,
   strategy.objective,
   token
  )

  /* STEP 3 ADSET */

  const adsetId = await createAdset(
   adAccountId,
   campaignId,
   strategy.budget,
   strategy.interests,
   token
  )

  const createdAds=[]

  /* STEP 4 ADS LOOP */

  for(const ad of strategy.ads){

   const imageUrl = await generateImage(ad.image_prompt)

   const hash = await uploadImage(adAccountId,imageUrl,token)

   const creativeId = await createCreative(
    adAccountId,
    pageId,
    hash,
    ad,
    token
   )

   const adId = await createAd(
    adAccountId,
    adsetId,
    creativeId,
    token
   )

   createdAds.push(adId)

  }

  res.json({
   success:true,
   campaignId,
   adsetId,
   ads:createdAds
  })

 }catch(error){

  console.log(error.response?.data || error.message)

  res.status(500).json({
   error:"Error creating campaign"
  })
 }

})

/* ---------------------------
SERVER
--------------------------- */

app.listen(PORT,()=>{

 console.log("🚀 Ads Creator API running on port",PORT)

})
