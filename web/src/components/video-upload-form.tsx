import { Label } from "@radix-ui/react-label";
import { Separator } from "@radix-ui/react-separator";
import { FileVideo, Upload, CheckCheck } from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import { getFFmpeg } from "@/lib/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { api } from "./../lib/axios";

type VideoUploaded = {
  id: string;
  name: string;
  path: string;
  transcription: string;
  createdAt: string;
  updatedAt: string;
};

type Status = "waiting" | "converting" | "uploading" | "generating" | "success";

interface VideoInputFormProps {
  onVideoUploaded: (id: string) => void;
}

const statusMessages = {
  waiting: "Aguardando...",
  converting: "Convertendo...",
  uploading: "Enviando...",
  generating: "Gerando transcrição...",
  success: "Sucesso",
};

export function VideoInputForm(props: VideoInputFormProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("waiting");
  const promptInputRef = useRef<HTMLTextAreaElement>(null);

  function handleFileSelected($event: ChangeEvent<HTMLInputElement>) {
    const { files } = $event.target;

    if (!files) {
      return;
    }

    const selectedFile = files[0];

    setVideoFile(selectedFile);
  }

  async function convertVideoToAudio(video: File) {
    const ffmpeg = await getFFmpeg();

    await ffmpeg.writeFile("input.mp4", await fetchFile(video));

    ffmpeg.on("progress", (progress) => {
      console.log("progress: ", Math.round(progress.progress * 100));
    });

    await ffmpeg.exec([
      "-i",
      "input.mp4",
      "-map",
      "0:a",
      "-b:a",
      "20k",
      "-acodec",
      "libmp3lame",
      "output.mp3",
    ]);

    const data = await ffmpeg.readFile("output.mp3");

    const audioFileBlob = new Blob([data], { type: "audio/mpeg" });

    const audioFile = new File([audioFileBlob], "audio.mp3", {
      type: "audio/mpeg",
    });

    return audioFile;
  }

  async function handleUploadVideo($event: FormEvent<HTMLFormElement>) {
    $event.preventDefault();
    const prompt = promptInputRef.current?.value;

    if (!videoFile) {
      return;
    }

    setStatus("converting");

    const autioFile = await convertVideoToAudio(videoFile);

    const payload = new FormData();

    payload.append("file", autioFile);
    payload.append("prompt", prompt ?? "");

    setStatus("uploading");

    const { data } = await api.post("/api/video", payload);

    const video = data.content as VideoUploaded;

    const { id: videoId } = video;

    setStatus("generating");

    await api.post(`/api/video/${videoId}/transcription`, {
      prompt,
    });

    setStatus("success");

    props.onVideoUploaded(videoId);
  }

  const previewURL = useMemo(() => {
    if (!videoFile) {
      return null;
    }
    return URL.createObjectURL(videoFile);
  }, [videoFile]);

  return (
    <form onSubmit={handleUploadVideo} className="space-y-6">
      <label
        htmlFor="video"
        className="relative border flex rounded-md aspect-video cursor-pointer border-dashed text-sm flex-col gap-2 items-center justify-center text-muted-foreground hover:bg-primary/5"
      >
        {previewURL ? (
          <video
            src={previewURL}
            controls={false}
            className="pointer-events-none absolute inset-0 w-full h-full object-cover rounded-md opacity-50"
          />
        ) : (
          <>
            <FileVideo className="w-4 h-4" />
            <span>Arraste e solte o vídeo aqui</span>
          </>
        )}
      </label>
      <input
        type="file"
        id="video"
        accept="video/mp4"
        className="sr-only"
        onChange={handleFileSelected}
      />

      <Separator />

      <div className="space-y-2">
        <Label htmlFor="transcription_prompt">Prompt de transcrição</Label>
        <Textarea
          disabled={status != "waiting"}
          ref={promptInputRef}
          id="transcription_prompt"
          className="h-20 leading-relaxed"
          placeholder="Inclua palacras chaves mencionadas no vídeo separadas por vírgula"
        ></Textarea>
      </div>
      <Button
        data-success={status === "success"}
        disabled={status != "waiting"}
        type="submit"
        className="w-full data-[success=true]:bg-emerald-500"
      >
        {status === "waiting" ? (
          <>
            Carregar vídeo
            <Upload className="w-4 h-4 ml-2"></Upload>
          </>
        ) : (
          <>
            {statusMessages[status]}
            <CheckCheck className="w-4 h-4 ml-2"></CheckCheck>
          </>
        )}
      </Button>
    </form>
  );
}
