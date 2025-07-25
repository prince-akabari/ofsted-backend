import multer from "multer";
import fs from "fs";
import path from "path";
import { Request, Response, NextFunction } from "express";

const evidenceDir = path.join(__dirname, "..", "..", "documents", "evidence");

// Ensure folder exists
if (!fs.existsSync(evidenceDir)) {
  fs.mkdirSync(evidenceDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, evidenceDir);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`;
    cb(null, uniqueName);
  },
});

const evidenceUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 3 }, // 5MB max, max 3 files
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF or Word documents are allowed"));
    }
  },
}).array("evidence", 3); // Accept up to 3 files with field name "evidence"

export const uploadEvidenceMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  evidenceUpload(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
        console.log(err)
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};
