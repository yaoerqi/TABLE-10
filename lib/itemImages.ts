/** First non-empty image URL in `images_array` (avoids `<img src="">` broken placeholders). */
export function firstItemImageUrl(images: string[] | null | undefined): string {
  if (!Array.isArray(images)) return "";
  const u = images.find((x) => typeof x === "string" && x.trim().length > 0);
  return u?.trim() ?? "";
}
