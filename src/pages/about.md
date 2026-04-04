---
layout: ../layouts/AboutLayout.astro
title: "About"
---

I'm **Himanshu Kumar** most people know me as **nycanshu** online. Backend engineer by choice, full-stack by necessity, and deeply suspicious of any system that doesn't have proper observability.

I work as a Software Engineer at [Tower](https://www.linkedin.com/in/okay-anshu/), where I spend most of my time building backend systems that are supposed to be scalable, maintainable, and definitely not on fire at 2am.

## What I actually do

I design and build **enterprise-grade backend systems and microservice architectures**, the kind that handle real load, real data, and real consequences when something breaks.

My primary stack is **Java (Spring Boot)**, **Python (Django, Django Tenants)**, and **Node.js (Express.js)**. I've shipped systems ranging from multi-tenant SaaS platforms to distributed storage integrations like CEPH, and I've learned the hard way that "it works on my machine" is not a deployment strategy.

When the job calls for it, I go deep on infrastructure too:

- **Linux** — comfortable in the terminal, not just `ls` and `cd`
- **Kubernetes** — orchestrating containers, writing manifests, debugging why a pod decided today was a good day to CrashLoopBackOff
- **Ceph Object Storage** — RADOS Gateway, bucket policies, the whole distributed storage rabbit hole. Built an [npm SDK for it](https://radosgw-admin.nycanshu.dev) because the existing one was from 2017 and JavaScript has changed slightly since then

I'm also an active **open source contributor** — earned the **Hacktoberfest Super Contributor** badge for meaningful contributions to real projects. And yes, "meaningful" is doing a lot of work in that sentence. No renaming a variable from `data` to `myData` and calling it a PR. No fixing a typo in a README that wasn't actually wrong. The kind of contributions where the maintainer actually replies with something other than "please read CONTRIBUTING.md." That kind.

## Things I've shipped

- [**radosgw-admin**](https://radosgw-admin.nycanshu.dev) — Zero-dependency TypeScript SDK for the Ceph RGW Admin API. AWS Sig V4 auth, full ESM/CJS dual build. ([Read the dev.to post](https://dev.to/okay_anshu/i-built-a-typescript-client-for-ceph-object-storage-because-the-only-npm-package-was-7-years-old-1nh0))
- **componentverse** — Power Platform Components Library for Canvas app developers
- Four freelance full-stack apps — healthcare management, loan systems, data processing tools, and a reading bookstore because apparently that's a thing

## Outside work

Before my current role, I completed multiple internships building web and Java applications, each one teaching me that requirements are always incomplete and timelines are always optimistic.

I've also mentored **70+ students** in Java Full Stack and Web Development (Next.js, Express.js), helping them survive their academic projects. Teaching forces you to understand things properly, which is why I recommend it to anyone who thinks they know a topic well.

## This blog

Personal space for writing about what I'm building, debugging, learning, or just have opinions about. No fixed topic, whatever I find interesting enough to write down.

The blog is built with Astro and my own theme called "The Void." It's available as a [template](https://github.com/nycanshu/blog) if you want it.
