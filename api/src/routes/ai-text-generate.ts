import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { z } from "zod";
import { openai } from "../lib/openai";

export async function aiTextGenerateRoute(app: FastifyInstance) {
  app.post("/api/generate", async (req, reply) => {
    try {
      const bodySchema = z.object({
        videoId: z.string(),
        template: z.string(),
        temperature: z.number().min(0).max(1).default(0.5),
      });

      const { temperature, template, videoId } = bodySchema.parse(req.body);

      const video = await prisma.video.findUniqueOrThrow({
        where: {
          id: videoId,
        },
      });

      if (!video.transcription) {
        return reply.status(400).send({
          error: "No transcription available for this video",
        });
      }

      const promptMessage = template.replace(
        "{transcription}",
        video.transcription
      );

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-16k",
        temperature,
        messages: [
          {
            role: "user",
            content: promptMessage,
          },
        ],
      });

      return response;
    } catch (error) {
      console.log(error);
      return reply.status(500).send({
        error,
      });
    }
  });
}
