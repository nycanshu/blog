/**
 * Prepend the configured base path to a given URL path.
 * Handles trailing/leading slash deduplication.
 *
 * @example getBase("/posts") => "/blog/posts" (when base is "/blog")
 * @example getBase("/") => "/blog" (when base is "/blog")
 * @example getBase("/posts") => "/posts" (when base is "/")
 */
export function getBase(path: string = "/"): string {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (base === "" || base === "/") return cleanPath;
  return `${base}${cleanPath}`;
}
