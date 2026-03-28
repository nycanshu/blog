/**
 * Projects data for the /projects page.
 *
 * To add a project: just add an entry to the relevant section's `projects` array.
 * The UI will pick it up automatically — no other files to touch.
 *
 * Fields:
 *   title       — project name
 *   description — one-liner (shown on card)
 *   url?        — GitHub repo link (omit for private repos)
 *   docs?       — documentation site
 *   live?       — live demo / deployed app
 *   tags        — tech stack pills shown on the card
 */

export type Project = {
  title: string;
  description: string;
  url?: string;
  docs?: string;
  live?: string;
  tags: string[];
};

export type ProjectSection = {
  label: string;
  projects: Project[];
};

export const PROJECT_SECTIONS: ProjectSection[] = [
  {
    label: "Open Source",
    projects: [
      {
        title: "radosgw-admin",
        description:
          "Node.js SDK for the Ceph RADOS Gateway Admin Ops API — manage users, buckets, quotas and rate limits. Zero dependencies, AWS Sig V4 auth.",
        url: "https://github.com/nycanshu/radosgw-admin",
        docs: "https://radosgw-admin.nycanshu.dev",
        tags: ["typescript", "ceph", "sdk", "zero-dependency"],
      },
    ],
  },
  {
    label: "Freelance",
    projects: [
      {
        title: "SheetEscalator",
        description:
          "Web app that streamlines data processing — auto-identifies pending records in Excel files and enables efficient escalation management.",
        url: "https://github.com/nycanshu/SheetEscalator",
        live: "https://sheet-escalator.vercel.app",
        tags: ["typescript"],
      },
      {
        title: "healthcare-javafx",
        description:
          "Comprehensive JavaFX healthcare management system for managing residents, staff, and bed assignments in a care home facility.",
        url: "https://github.com/nycanshu/healthcare-javafx",
        tags: ["java", "javafx", "mysql", "spring"],
      },
      {
        title: "readnigstore",
        description:
          "Reading Book Store — full CRUD with JavaFX UI, JDBC, MVC pattern, MySQL backend.",
        url: "https://github.com/nycanshu/readnigstore",
        tags: ["java", "javafx", "mysql"],
      },
      {
        title: "loan",
        description: "Loan management application.",
        url: "https://github.com/nycanshu/loan",
        tags: ["typescript"],
      },
    ],
  },
  {
    label: "Personal",
    projects: [
      {
        title: "componentverse",
        description:
          "Power Platform Components Library — a central hub for Power Platform devs to find, share, and use pre-built components for Canvas apps.",
        live: "https://componentverse.vercel.app",
        tags: ["typescript"],
      },
      {
        title: "my-pet-buddy",
        description:
          "Chrome extension that brings adorable animated pets to your browser — cats, dogs, and animals parade along your screen.",
        url: "https://github.com/nycanshu/my-pet-buddy",
        live: "https://nycanshu.github.io/my-pet-buddy/",
        tags: ["javascript", "chrome-extension"],
      },
      {
        title: "smart-storage-hub",
        description:
          "Secure Express.js backend for MinIO with JWT auth, PostgreSQL via Prisma, user-specific bucket management, and admin-level MinIO integration.",
        url: "https://github.com/nycanshu/smart-storage-hub",
        tags: ["javascript", "minio", "prisma"],
      },
      {
        title: "Ceph-RGW-Admin-Server-Express-Js",
        description:
          "Express.js REST server wrapping Ceph RADOS Gateway admin operations.",
        url: "https://github.com/nycanshu/Ceph-RGW-Admin-Server-Express-Js",
        tags: ["javascript", "ceph"],
      },
      {
        title: "sanskriti",
        description: "Mobile application built with Dart/Flutter.",
        url: "https://github.com/nycanshu/sanskriti",
        tags: ["dart", "flutter"],
      },
    ],
  },
];
