/**
 * Optimisation des images AVANT l'envoi : côté le plus long ≤ 2000 px, poids ≤ 1 Mo,
 * format WebP. La qualité est abaissée par paliers, puis les dimensions si nécessaire.
 * Une photo de smartphone de plusieurs Mo devient ainsi légère et rapide à afficher.
 *
 * Non traités : SVG / ICO (logos, favicon), AVIF (déjà compressé), GIF.
 * Si le navigateur ne sait pas encoder le WebP, le fichier d'origine est conservé
 * (Storage applique de toute façon la limite de taille du bucket).
 */
const COMPRESSIBLE = new Set(["image/jpeg", "image/png", "image/webp"]);
export const MAX_DIMENSION = 2000;
export const MAX_BYTES = 1024 * 1024;
const QUALITIES = [0.85, 0.78, 0.7, 0.62];

const encode = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));

export async function optimizeImage(file: File): Promise<File> {
  if (!COMPRESSIBLE.has(file.type) || typeof createImageBitmap !== "function" || typeof document === "undefined") return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  try {
    const longest = Math.max(bitmap.width, bitmap.height);
    // Déjà conforme : on n'altère pas l'image.
    if (longest <= MAX_DIMENSION && file.size <= MAX_BYTES && file.type === "image/webp") return file;

    let scale = Math.min(1, MAX_DIMENSION / longest);
    let best: Blob | null = null;
    for (let pass = 0; pass < 4; pass += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) return file;
      context.imageSmoothingQuality = "high";
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      for (const quality of QUALITIES) {
        const blob = await encode(canvas, quality);
        // Certains navigateurs renvoient du PNG s'ils ne savent pas encoder le WebP.
        if (!blob || blob.type !== "image/webp") return file;
        if (!best || blob.size < best.size) best = blob;
        if (blob.size <= MAX_BYTES) break;
      }
      if (best && best.size <= MAX_BYTES) break;
      scale *= 0.8; // encore trop lourd : on réduit les dimensions.
    }

    if (!best) return file;
    // Une image d'origine conforme et plus légère est conservée telle quelle.
    if (file.size <= MAX_BYTES && longest <= MAX_DIMENSION && best.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
    return new File([best], name, { type: "image/webp", lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
}
