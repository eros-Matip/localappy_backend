import fs from "fs/promises";

export const cleanUploadedFiles = async (files: Express.Multer.File[] = []) => {
  const deletePromises = files.map((file) =>
    fs.unlink(file.path).catch(() => {})
  );
  await Promise.all(deletePromises);
};
