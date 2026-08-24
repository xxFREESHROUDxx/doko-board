/** Square edge, in pixels, that every uploaded avatar is reduced to. */
export const AVATAR_SIZE = 128;

/**
 * Must stay at or below AVATAR_MAX_LENGTH in the API's UpdateProfileDto, which
 * is itself kept under Express's 100kb JSON body limit. Checked here too so an
 * oversized picture is refused with a useful message instead of a 400.
 */
export const AVATAR_MAX_LENGTH = 64_000;

/**
 * Reduces a chosen image file to a small square data URI.
 *
 * Always JPEG: quality is tunable so the output size is predictable, and it is
 * universally supported. WebP would be smaller but silently falls back to PNG
 * where it isn't supported, which can blow past the size cap. Avatars render
 * inside a circle, so the lack of transparency costs nothing.
 */
export async function fileToAvatarDataUri(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("That file isn't an image.");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("That image couldn't be read.");
  }

  try {
    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("That image couldn't be processed.");

    // Centre-crop to a square first, so a wide photo isn't squashed.
    const side = Math.min(bitmap.width, bitmap.height);
    const sourceX = (bitmap.width - side) / 2;
    const sourceY = (bitmap.height - side) / 2;
    context.drawImage(bitmap, sourceX, sourceY, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);

    const dataUri = canvas.toDataURL("image/jpeg", 0.82);

    if (dataUri.length > AVATAR_MAX_LENGTH) {
      throw new Error("That image is too large, even resized. Try a smaller one.");
    }
    return dataUri;
  } finally {
    bitmap.close();
  }
}
