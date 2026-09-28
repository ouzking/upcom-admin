/**
 * Optimisation des images AVANT l'envoi : redimensionnement (côté le plus long
 * ≤ 2400 px) et conversion en WebP. Une photo de smartphone de plusieurs Mo
 * passe ainsi sous les limites des buckets et le site charge plus vite.
 *
 * Non traités : SVG / ICO (logos, favicon), AVIF (déjà compressé), GIF.
 * Si le navigateur ne sait pas faire, ou si le résultat n'est pas plus léger,
 * le fichier d'origine est conservé.
 */
const COMPRESSIBLE = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_DIMENSION = 2400;
const QUALITY = 0.85;
/** En dessous, une image déjà aux bonnes dimensions est envoyée telle quelle. */
const SMALL_ENOUGH = 400 * 1024;

export async function optimizeImage(file: File): Promise<File> {
  if (!COMPRESSIBLE.has(file.type) || typeof createImageBitmap !== "function" || typeof document === "undefined") return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= SMALL_ENOUGH) return file;

    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", QUALITY));
    // Certains navigateurs renvoient du PNG s'ils ne savent pas encoder le WebP.
    if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
    return new File([blob], name, { type: "image/webp", lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
}
