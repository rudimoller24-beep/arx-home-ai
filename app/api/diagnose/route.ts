import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import jwt from "jsonwebtoken";
import crypto from "crypto";

export const runtime = "nodejs";

type JwtPayload = {
  sub: string;
  email?: string;
  role?: string;
  iat?: number;
  exp?: number;
};

const MAX_IMAGES = 5;
const MAX_FILE_SIZE_MB = 10;
const BUCKET_NAME = "diagnosis-images";

function getBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  const cookieToken =
    request.cookies.get("token")?.value ||
    request.cookies.get("auth_token")?.value ||
    request.cookies.get("jwt")?.value ||
    null;

  return cookieToken;
}

function getUserFromToken(token: string): JwtPayload {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("Missing JWT_SECRET");
  }

  const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

  if (!decoded?.sub) {
    throw new Error("Invalid token payload: missing sub");
  }

  return decoded;
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey);
}

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  return new OpenAI({ apiKey });
}

function sanitizeFileName(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf(".");
  const baseName =
    lastDotIndex > 0 ? fileName.slice(0, lastDotIndex) : fileName;
  const extension = lastDotIndex > 0 ? fileName.slice(lastDotIndex + 1) : "jpg";

  const safeBase = baseName
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);

  const safeExtension = extension
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 10);

  return `${safeBase || "image"}.${safeExtension || "jpg"}`;
}

function cleanResult(text: string): string {
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

function isValidImageFile(file: File) {
  return file.size > 0 && file.type.startsWith("image/");
}

async function uploadImageToSupabase(params: {
  supabase: ReturnType<typeof getSupabaseAdmin>;
  file: File;
  userId: string;
  diagnosisId: string;
  index: number;
}) {
  const { supabase, file, userId, diagnosisId, index } = params;

  const fileExt = sanitizeFileName(file.name).split(".").pop() || "jpg";
  const filePath = `${userId}/${diagnosisId}/${index + 1}-${crypto.randomUUID()}.${fileExt}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, buffer, {
      contentType: file.type || "image/jpeg",
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

  if (!data?.publicUrl) {
    throw new Error(`Failed to create public URL for ${file.name}`);
  }

  return {
    path: filePath,
    publicUrl: data.publicUrl,
  };
}

export async function POST(request: NextRequest) {
  const uploadedFilePaths: string[] = [];

  try {
    const token = getBearerToken(request);

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized: missing token" },
        { status: 401 }
      );
    }

    let user: JwtPayload;

    try {
      user = getUserFromToken(token);
    } catch {
      return NextResponse.json(
        { error: "Unauthorized: invalid token" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const promptRaw = formData.get("prompt");
    const prompt = typeof promptRaw === "string" ? promptRaw.trim() : "";

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const uploadedItems = formData.getAll("images");
    const imageFiles = uploadedItems.filter(
      (item): item is File => item instanceof File && isValidImageFile(item)
    );

    if (imageFiles.length > MAX_IMAGES) {
      return NextResponse.json(
        { error: `You can upload up to ${MAX_IMAGES} images.` },
        { status: 400 }
      );
    }

    for (const file of imageFiles) {
      const sizeMb = file.size / 1024 / 1024;

      if (sizeMb > MAX_FILE_SIZE_MB) {
        return NextResponse.json(
          {
            error: `${file.name} is too large. Max file size is ${MAX_FILE_SIZE_MB}MB per image.`,
          },
          { status: 400 }
        );
      }
    }

    const supabase = getSupabaseAdmin();
    const openai = getOpenAIClient();
    const diagnosisId = crypto.randomUUID();

    const uploadedImages = await Promise.all(
      imageFiles.map(async (file, index) => {
        const uploaded = await uploadImageToSupabase({
          supabase,
          file,
          userId: user.sub,
          diagnosisId,
          index,
        });

        uploadedFilePaths.push(uploaded.path);
        return uploaded;
      })
    );

    const imageUrls = uploadedImages.map((item) => item.publicUrl);

    const instructions = `
You are a premium AI field diagnosis assistant for contractors across all trades.

Your response must always be:
- neutral
- professional
- white-label
- practical
- easy to hand to a client or team member
- mobile-friendly in formatting

Do not mention brands, internal system details, or unsupported certainty.
Do not pretend to have inspected hidden conditions behind walls, ceilings, floors, or equipment.
If the photos are insufficient, say what is visible and what still needs on-site confirmation.

Return the diagnosis in this exact structure:

1. Issue Summary
2. Likely Cause
3. Visible Evidence From Photos
4. Recommended Next Steps
5. Materials / Tools Likely Needed
6. Risk Level
7. Client-Friendly Summary

Keep it concise but useful. Use plain English.
`.trim();

    const userContent: Array<
      | { type: "input_text"; text: string }
      | { type: "input_image"; image_url: string }
    > = [
      {
        type: "input_text",
        text: `Contractor request:\n${prompt}\n\nPlease assess the uploaded image(s) together with the text request and provide a neutral professional diagnosis.`,
      },
      ...imageUrls.map((url) => ({
        type: "input_image" as const,
        image_url: url,
      })),
    ];

    const response = await openai.responses.create({
      model: process.env.OPENAI_DIAGNOSE_MODEL || "gpt-4.1-mini",
      instructions,
      input: [
        {
          role: "user",
          content: userContent,
        },
      ],
    });

    const result =
      cleanResult(response.output_text || "") ||
      "No diagnosis result was returned.";

    const { error: insertError } = await supabase.from("diagnoses").insert({
      id: diagnosisId,
      user_id: user.sub,
      prompt,
      result,
      images: imageUrls,
    });

    if (insertError) {
      throw new Error(`Failed to save diagnosis: ${insertError.message}`);
    }

    return NextResponse.json({
      success: true,
      result,
      images: imageUrls,
    });
  } catch (error) {
    console.error("Diagnose route error:", error);

    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json(
      {
        error: "Diagnosis failed",
        details: message,
      },
      { status: 500 }
    );
  }
}