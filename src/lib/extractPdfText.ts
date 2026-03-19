export async function extractPdfBase64(file: File): Promise<string> {
  if (file.type !== "application/pdf") {
    throw new Error("File must be a PDF");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result as string;
      // result is "data:application/pdf;base64,<base64string>"
      const base64 = result.split(",")[1];
      if (!base64) {
        reject(new Error("Failed to extract base64 from file"));
        return;
      }
      resolve(base64);
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsDataURL(file);
  });
}
