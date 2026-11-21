
import { Router } from "express";
import multer from "multer";
import { fromNodeHeaders } from "better-auth/node";

import { createAuth } from "../config/auth.js";

interface ImgBBResponse {
  success: boolean;
  data?: {
    url: string;
    display_url: string;
  };
  error?: {
    message: string;
  };
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return callback(
        new Error("Only JPG, PNG and WebP images are allowed.")
      );
    }

    callback(null, true);
  },
});

const createUploadRoutes = (
  auth: ReturnType<typeof createAuth>
) => {
  const router = Router();

  router.post("/", async (req, res) => {
    try {
      // Check login before accepting an image
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });

      if (!session) {
        return res.status(401).json({
          success: false,
          message: "Please login to upload an image.",
        });
      }

      // Handle uploaded image
      upload.single("image")(req, res, async (uploadError) => {
        if (uploadError) {
          return res.status(400).json({
            success: false,
            message:
              uploadError instanceof multer.MulterError &&
              uploadError.code === "LIMIT_FILE_SIZE"
                ? "Image must be smaller than 5 MB."
                : uploadError.message,
          });
        }

        if (!req.file) {
          return res.status(400).json({
            success: false,
            message: "Please select an image.",
          });
        }

        const apiKey = process.env.IMGBB_API_KEY;

        if (!apiKey) {
          return res.status(500).json({
            success: false,
            message: "Image upload is not configured.",
          });
        }

        try {
          // Prepare image for ImgBB
          const formData = new FormData();

          formData.append(
            "image",
            req.file.buffer.toString("base64")
          );

          // Upload to ImgBB from server
          const response = await fetch(
            `https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`,
            {
              method: "POST",
              body: formData,
              signal: AbortSignal.timeout(30000),
            }
          );

          const result =
            (await response.json()) as ImgBBResponse;

          if (!response.ok || !result.success || !result.data?.url) {
            console.error(
              "ImgBB upload failed:",
              response.status,
              result.error?.message
            );

            return res.status(502).json({
              success: false,
              message: "Image hosting service rejected the upload.",
            });
          }

          return res.status(200).json({
            success: true,
            message: "Image uploaded successfully.",
            data: {
              imageUrl: result.data.url,
            },
          });
        } catch (error) {
          console.error("ImgBB Upload Error:", error);

          return res.status(502).json({
            success: false,
            message: "Image upload service is unavailable.",
          });
        }
      });
    } catch (error) {
      console.error("Upload Authentication Error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to process image upload.",
      });
    }
  });

  return router;
};

export default createUploadRoutes;
