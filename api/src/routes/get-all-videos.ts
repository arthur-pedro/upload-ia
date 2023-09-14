import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";

export async function getAllVideosRoute(app: FastifyInstance) {
  app.get("/api/video", async () => {
    const videos = await prisma.video.findMany();
    return videos;
  });
}