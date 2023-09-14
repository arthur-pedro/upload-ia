import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { fastifyMultipart } from "@fastify/multipart";

import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import { pipeline } from "node:stream";
import { promisify } from "node:util";

const pump = promisify(pipeline);

export async function uploadVideoRoute(app: FastifyInstance) {
  app.register(fastifyMultipart, {
    limits: {
      fileSize: 1_048_576 * 25, // 25MB
    },
  });

  app.post("/api/video", async (req, reply) => {
    const data = await req.file();

    if (!data) {
      return reply.status(400).send({
        error: "No file uploaded",
      });
    }

    const extention = path.extname(data.filename);

    if (extention !== ".mp3") {
      return reply.status(400).send({
        error: "Invalid file type",
      });
    }

    const fileBaseName = path.basename(data.filename, extention);

    const fileUploadName = `${fileBaseName}-${randomUUID()}${extention}`;

    const filePath = path.resolve(__dirname, "../../tmp", fileUploadName);

    await pump(data.file, fs.createWriteStream(filePath));

    const video = await prisma.video.create({
      data: {
        name: data.fieldname,
        path: filePath,
        transcription: "",
      },
    });

    return reply.status(200).send({
      message: "File uploaded",
      content: video,
    });
  });
}
