import { generateUploadButton, generateUploadDropzone, generateReactHelpers, useDropzone as useUploadThingDropzone } from "@uploadthing/react";
import type { OurFileRouter } from "../../../backend/uploadthing";

const BACKEND_URL = import.meta.env.VITE_BACKEND_BASE_URL || "http://localhost:3000";

export const UploadButton = generateUploadButton<OurFileRouter>({
  url: `${BACKEND_URL}/api/uploadthing`,
});

export const UploadDropzone = generateUploadDropzone<OurFileRouter>({
  url: `${BACKEND_URL}/api/uploadthing`,
});

export const { useUploadThing, uploadFiles } = generateReactHelpers<OurFileRouter>({
  url: `${BACKEND_URL}/api/uploadthing`,
});

export { useUploadThingDropzone as useDropzone };
