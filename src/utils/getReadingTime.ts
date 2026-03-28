/**
 * Estimate reading time from raw markdown/text content.
 * Average reading speed: 200 words per minute.
 */
export function getReadingTime(content: string): string {
  const words = content.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / 200);
  return `${minutes} min read`;
}
