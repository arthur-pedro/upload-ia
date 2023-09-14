import { fastify } from "fastify";
import { fastifyCors } from "@fastify/cors";
import { getAllPromptsRoute } from "./routes/get-all-prompts";
import { uploadVideoRoute } from "./routes/upload-video";
import { getAllVideosRoute } from "./routes/get-all-videos";
import { createTranscriptionRoute } from "./routes/create-transcription";
import { aiTextGenerateRoute } from "./routes/ai-text-generate";

const app = fastify();

app.register(fastifyCors, {
  origin: "*",
});

app.register(getAllPromptsRoute);
app.register(getAllVideosRoute);
app.register(uploadVideoRoute);
app.register(createTranscriptionRoute);
app.register(aiTextGenerateRoute);

app.listen({ port: 3333 }).then((address) => {
  console.log(`Server listening at ${address}`);
});
