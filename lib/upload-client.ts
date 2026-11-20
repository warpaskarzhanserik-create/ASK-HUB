"use client";
import { upload } from "@vercel/blob/client";

export async function uploadFile(file: File, folder: string) {
  const safe = file.name.replace(/[^\w.\-]+/g, "_").slice(-80) || "file";
  const blob = await upload(`${folder}/${safe}`, file, { access: "public", handleUploadUrl: "/api/upload" });
  return { url: blob.url, contentType: file.type || blob.contentType, name: file.name };
}
