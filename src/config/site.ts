/**
 * Site-wide configuration.
 * Controls blog metadata, pagination, features, and SEO defaults.
 */
export const SITE = {
  website: "https://blog.nycanshu.dev/",
  author: "nycanshu",
  profile: "https://github.com/nycanshu",
  desc: "Backend engineer writing about Java, Node.js, Ceph, Kubernetes, and open source tooling.",
  title: "nycanshu",
  ogImage: "og-default.jpg",
  lightAndDarkMode: true,
  postPerIndex: 4,
  postPerPage: 6,
  scheduledPostMargin: 15 * 60 * 1000,
  showArchives: true,
  showBackButton: true,
  editPost: {
    enabled: true,
    text: "Edit on GitHub",
    url: "https://github.com/nycanshu/blog/edit/main/",
  },
  dynamicOgImage: true,
  dir: "ltr",
  lang: "en",
  timezone: "Asia/Kolkata",
} as const;
