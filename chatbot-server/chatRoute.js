import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { OpenAI } from "langchain/llms/openai";
import { PineconeStore } from "langchain/vectorstores/pinecone";
import { RetrievalQAChain } from "langchain/chains";
import { PineconeClient } from "@pinecone-database/pinecone";

export const setupChatbot = async (walletAddress, userQuery) => {
  const pinecone = new PineconeClient();
  await pinecone.init({
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENV,
  });

  const model = new OpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    temperature: 0.7,
    modelName: "gpt-4",
  });

  const vectorStore = await PineconeStore.fromExistingIndex(
    pinecone.Index(process.env.PINECONE_INDEX),
    new OpenAIEmbeddings(),
    { namespace: `wallet_${walletAddress}` }
  );

  const chain = RetrievalQAChain.fromLLM(model, vectorStore.asRetriever());

  const result = await chain.call({
    query: userQuery,
  });

  return result.text;
};
