import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { z } from "zod";
import { createReadStream } from "node:fs";
import { openai } from "./../lib/openai";

export async function createTranscriptionRoute(app: FastifyInstance) {
  app.post("/api/video/:videoId/transcription", async (req, reply) => {
    try {
      const paramsSchema = z.object({
        videoId: z.string(),
      });

      const bodySchema = z.object({
        prompt: z.string(),
      });

      const { videoId } = paramsSchema.parse(req.params);

      const { prompt } = bodySchema.parse(req.body);

      const video = await prisma.video.findUniqueOrThrow({
        where: {
          id: videoId,
        },
      });

      const { path } = video;

      const audioReadStream = createReadStream(path);

      const response = await openai.audio.transcriptions.create({
        file: audioReadStream,
        model: "whisper-1",
        language: "pt",
        response_format: "json",
        temperature: 0,
        prompt,
      });

      await prisma.video.update({
        where: {
          id: videoId,
        },
        data: {
          transcription: response.text,
        },
      });

      return response.text;
    } catch (error) {
      console.log(error);
      return reply.status(500).send({
        error,
      });
    }
  });
}
