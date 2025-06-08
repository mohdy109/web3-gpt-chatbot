import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { RetrievalQAChain } from "langchain/chains";
import { PineconeStore } from "@langchain/community/vectorstores/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";

export const setupChatbot = async (walletAddress, userQuery) => {
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });

  const index = pinecone.index(process.env.PINECONE_INDEX);

  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  const vectorStore = await PineconeStore.fromExistingIndex(index, embeddings, {
    namespace: `wallet_${walletAddress}`,
  });

  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    temperature: 0.7,
    modelName: "gpt-4",
  });

  const chain = RetrievalQAChain.fromLLM(model, vectorStore.asRetriever());

  const result = await chain.call({
    query: userQuery,
  });

  return result.text;
};
