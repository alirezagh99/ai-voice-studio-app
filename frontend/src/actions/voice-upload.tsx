"use server";

import { auth } from "~/lib/auth";
import { headers } from "next/headers";

import { db } from "~/server/db";
import { cache } from "react";

import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

interface UploadVoiceResult {
  success: boolean;
  id?: string;
  url?: string;
  publicId?: string;
  error?: string;
}

export async function uploadVoice(
  formData: FormData,
): Promise<UploadVoiceResult> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // if (
    //   !env.AWS_ACCESS_KEY_ID ||
    //   !env.AWS_SECRET_ACCESS_KEY ||
    //   !env.AWS_S3_BUCKET_NAME
    // ) {
    //   return { success: false, error: "AWS S3 not configured" };
    // }

    const file = formData.get("voice") as File;

    if (!file) {
      return { success: false, error: "No file provided" };
    }

    if (!file.type.startsWith("audio/")) {
      return { success: false, error: "File must be audio" };
    }

    if (file.size > 10 * 1024 * 1024) {
      return { success: false, error: "File must be under 10MB" };
    }

    // const fileExtension = file.name.split(".").pop();

    // const fileName = `voices/${session.user.id}/${Date.now()}.${fileExtension}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadResult = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: `voices/${session.user.id}`,
            resource_type: "video",
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          },
        )
        .end(buffer);
    });

    const uploadedVoice = await db.uploadedVoice.create({
      data: {
        name: file.name,
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        userId: session.user.id,
      },
    });

    return {
      success: true,
      id: uploadedVoice.id,
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
    };
  } catch (error) {
    console.error("Voice upload error:", error);
    return { success: false, error: "Failed to upload voice file" };
  }
}

export interface UploadedVoice {
  id: string;
  name: string;
  url: string;
  publicId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export const getUserUploadedVoices = cache(async () => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return {
        success: false,
        error: "Unauthorized",
        voices: [] as UploadedVoice[],
      };
    }

    const uploadedVoices = await db.uploadedVoice.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      voices: uploadedVoices as UploadedVoice[],
    };
  } catch (error) {
    console.error("Error fetching uploaded voices:", error);
    return {
      success: false,
      error: "Failed to fetch uploaded voices",
      voices: [] as UploadedVoice[],
    };
  }
});
