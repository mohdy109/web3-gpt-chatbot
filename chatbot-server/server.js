import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import { Configuration, OpenAIApi } from "openai"
import { setupChatbot } from "./chatRoute";



dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

const configuration = new Configuration({ apikey: process.env.OPENAI_API_KEY });

const openai = new OpenAIApi(Configuration);

const PINECONE_BASE_URL = `https://${process.env.PINECONE_INDEX}-${process.env.PINECONE_ENV}.svc.pinecone.io`;

app.post("/embed", async (req, res) => {
    const { wallet, text } = req.body;
  
    if (!wallet || !text) {
      return res.status(400).json({ error: "wallet and text are required" });
    }
  
    try {
      // 1. Get embedding
      const embeddingResponse = await openai.createEmbedding({
        model: "text-embedding-3-small",
        input: text,
      });
  
      const vector = embeddingResponse.data.data[0].embedding;
  
      // 2. Store in Pinecone
      await axios.post(
        `${PINECONE_BASE_URL}/vectors/upsert`,
        {
          vectors: [
            {
              id: wallet,
              values: vector,
              metadata: { wallet },
            },
          ],
          namespace: "wallets",
        },
        {
          headers: {
            "Api-Key": process.env.PINECONE_API_KEY,
            "Content-Type": "application/json",
          },
        }
      );
  
      res.status(200).json({ message: "Stored in Pinecone successfully" });
    } catch (error) {
      console.error("Error:", error?.response?.data || error.message);
      res.status(500).json({ error: "Failed to process embedding" });
    }
  });
  
  app.post("/chat", async (req, res) => {
    const { wallet, query } = req.body;
    if (!wallet || !query) return res.status(400).send("wallet and query required");
  
    try {
      const response = await setupChatbot(wallet, query);
      res.json({ answer: response });
    } catch (err) {
      console.error(err);
      res.status(500).send("LangChain error");
    }
  });

  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });