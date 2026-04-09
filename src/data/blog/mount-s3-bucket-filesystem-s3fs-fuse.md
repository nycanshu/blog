---
title: "How to Mount Any S3 Bucket as a Linux Filesystem with s3fs-fuse (Open Source Alternative to AWS S3 Files)"
description: "Step by step guide to mount any S3-compatible bucket (Ceph, MinIO, AWS) as a Linux filesystem using the open source s3fs-fuse tool. Tested end to end against a real Ceph cluster, with verification commands and honest performance notes."
pubDatetime: 2026-04-09T00:00:00+05:30
featured: true
tags:
  - s3
  - ceph
  - object-storage
  - s3fs
  - linux
  - fuse
  - open-source
  - self-hosted
---

So AWS recently announced **S3 Files**, a new managed feature that lets you access S3 buckets like regular file systems. Honestly, it is a solid offering. If you are already deep into the AWS ecosystem and you want a fully managed solution with proper support, it makes complete sense to use it.

But here is the thing I want to share with you. The exact same capability has existed in the open source world for many years now, in the form of a small tool called **s3fs-fuse**. I have been running it on my own Ceph cluster for a long time, and it works with literally any S3-compatible storage. Ceph, MinIO, Backblaze, AWS itself, all of them.

So if you do not want to be locked into one cloud provider for this single feature, or you simply want to understand how all of this actually works under the hood, this post is for you. I have tested every single command in this guide against a real Ceph RGW endpoint, so you can trust that things will actually work when you try them yourself.

> **Tested setup:** Ubuntu 24.04 (ARM64) running on OrbStack, mounting a real bucket called `anshu` against a production Ceph RGW endpoint. Every command in this post was verified end to end before publishing.

## Why mount a bucket as a filesystem at all

Object storage APIs are wonderful when you are writing fresh new code. But the moment you have to deal with existing tools or older applications, things become painful very quickly.

Here are the situations where mounting a bucket as a filesystem makes total sense:

- **Legacy applications** that only know how to read and write files. Think of your old logging tools, image processors, batch jobs from 2015. None of them are getting an SDK rewrite anytime soon.
- **Backups** using tools you already know, like `rsync`, `tar`, and `cp`. No need to learn a new tool just to back up a folder.
- **Static file serving** without rewriting your entire app to use S3 SDK calls.
- **Quick exploration** when you just want to do a `ls` or `cat` or `du -sh` on your bucket contents to see what is sitting there.
- **Sharing storage across containers** without writing custom orchestration logic.

Now let me also tell you the cases where you should *not* do this. This part is important because most blogs do not mention it.

- **High throughput databases.** Random writes on object storage are absolutely brutal. Do not try this.
- **Anything needing atomic operations.** FUSE has its quirks, and S3 does not have file locks. So if your app depends on atomic renames or file locking, expect problems.
- **Apps that already speak S3 natively.** If your code has an S3 client, just use the SDK. Adding a filesystem layer is unnecessary overhead.

The basic rule is simple. Use this when the application thinks it is reading files but you want the data to actually live in object storage. That is the sweet spot.

## How it actually works

![How s3fs-fuse layers fit together. App, FUSE kernel module, s3fs daemon, S3 API endpoint, bucket](../../assets/diagrams/mount-s3-fuse-architecture.svg)

Let me explain the architecture in plain English so you understand what is happening at every layer.

Your application makes normal POSIX file operations. Things like `open`, `read`, `write`, `readdir`, the usual stuff. These calls go to the Linux kernel as they always do. But here is the magic. The kernel sees that the path is inside a FUSE mount point, so instead of going to a regular disk driver, it forwards the operation to the FUSE module.

FUSE then passes the request to the **s3fs-fuse daemon**, which is just a small program running in user space. The daemon takes that file operation and translates it into the equivalent S3 API call. A `read` becomes a `GET /file.txt`. A `write` becomes a `PUT /file.txt`. A `ls` becomes a `LIST` operation.

The S3 API call goes to whatever endpoint you point it at. Could be Ceph RGW, could be MinIO, could be AWS, could be Backblaze. As long as it speaks S3, it works.

The beauty of this design is that your application has absolutely no idea object storage is involved. As far as the app is concerned, it is just reading from `/mnt/my-bucket/file.txt`. Same as any other file on the disk.

## Prerequisites

Before we start, you need a few things in place:

- A Linux machine. Ubuntu or Debian is what I am using here. If you are on RHEL, Rocky, or Fedora, the commands are almost identical, just use `dnf` instead of `apt`.
- An S3-compatible endpoint with an access key and a secret key.
- A bucket already created on the storage backend. Important point, **s3fs does not auto-create buckets for you**. You have to create the bucket first.
- FUSE installed. This is already present in any modern Linux kernel, so you do not need to do anything for this.

That is it. Let us get started.

## Step 1: Install s3fs-fuse

On Ubuntu or Debian:

```bash
sudo apt update
sudo apt install s3fs -y
s3fs --version
```

On RHEL, Rocky, or Fedora:

```bash
sudo dnf install s3fs-fuse -y
```

If the version command prints a version number, you are good to proceed. In my test the version was `1.95`, which is the current stable release.

## Step 2: Create the credentials file

This is where we store your access key and secret key so that s3fs can authenticate with the S3 endpoint.

```bash
echo "ACCESS_KEY:SECRET_KEY" > ~/.passwd-s3fs
chmod 600 ~/.passwd-s3fs
```

Now please pay attention to this next part. **The chmod 600 is mandatory.** I am not exaggerating. s3fs flat out refuses to start if the file permissions are not exactly 600. This is the single most common mistake people make when setting up s3fs for the first time. If you ever see a "permissions denied" error during mount, this is almost certainly the reason.

Replace `ACCESS_KEY` and `SECRET_KEY` with your actual credentials. Where do you get these credentials from?

- **AWS:** Generate them from the IAM console.
- **Ceph:** Run `radosgw-admin user create` on your cluster, or ask your storage admin.
- **MinIO:** The web console gives them to you when you create a new user.

## Step 3: Create a mount point

The mount point is just an empty directory where your bucket will appear to live. Think of it as the door through which your filesystem will access the bucket.

```bash
sudo mkdir -p /mnt/my-bucket
sudo chown $USER:$USER /mnt/my-bucket
```

The `chown` step is important because s3fs needs to be able to write to this directory as your user. Without it, you will get permission errors when the daemon tries to set up the mount.

## Step 4: Mount the bucket

Now comes the actual mounting. The command is slightly different depending on whether you are using AWS S3 directly or a self-hosted endpoint like Ceph or MinIO.

For **AWS S3**:

```bash
s3fs my-bucket /mnt/my-bucket -o passwd_file=~/.passwd-s3fs
```

Simple and clean.

For **Ceph RGW, MinIO, or any custom S3 endpoint**:

```bash
s3fs my-bucket /mnt/my-bucket \
  -o passwd_file=~/.passwd-s3fs \
  -o url=https://s3.your-cluster.com \
  -o use_path_request_style \
  -o nonempty
```

Let me explain each flag, because these matter and most tutorials gloss over them.

- **`url=...`** is your S3-compatible endpoint URL. You skip this entirely for AWS because s3fs already knows the AWS endpoints.
- **`use_path_request_style`** is absolutely critical for self-hosted endpoints. By default, s3fs uses what is called virtual-hosted-style requests, which look like `https://my-bucket.s3.example.com`. Most non-AWS endpoints do not support this format and use path-style instead, which looks like `https://s3.example.com/my-bucket`. This flag tells s3fs to use the path style.
- **`nonempty`** allows you to mount over a directory that is not empty. This is optional but sometimes useful.

After running the command, you might think nothing happened. That is normal. s3fs runs as a background daemon and detaches from the terminal silently. To check if it actually worked, run this:

```bash
mount | grep fuse.s3fs
```

You should see a line like this:

```
s3fs on /mnt/my-bucket type fuse.s3fs (rw,nosuid,nodev,relatime,user_id=501,group_id=501)
```

If you see that, the mount is real and active. If you do not see anything, the mount failed silently. This is actually a very common failure mode that I want to warn you about. If s3fs cannot connect for any reason, it might not show an error, and you will end up writing files to the local empty directory at the mount point instead of to the actual bucket. So always verify the mount table after running the command.

## Step 5: Verify it works with a basic write

Now let us write a small test file and read it back, to make sure the round trip is working.

```bash
ls /mnt/my-bucket
echo "hello from s3fs" > /mnt/my-bucket/test.txt
cat /mnt/my-bucket/test.txt
```

If you see `hello from s3fs` in the output, your mount is working. The file is being written through the FUSE layer, translated to an S3 PUT request, and stored in your bucket.

But wait. How do you know that the file actually went to the real bucket and not just to local disk? This is the question every careful person asks. And the answer is in the next step.

## Step 6: Verify it really hit the S3 bucket (not local disk)

This step is something I added because I have personally seen people get fooled by silent mount failures. The way to truly verify is to use a completely different tool to query the S3 bucket directly, bypassing s3fs entirely.

We will use the AWS CLI for this, even though we are talking to a Ceph cluster. This works because Ceph RGW speaks the standard S3 API.

Install the AWS CLI:

```bash
sudo apt install -y awscli
```

Now query your bucket using the same credentials, but pointing the CLI at your custom endpoint:

```bash
AWS_ACCESS_KEY_ID=YOUR_KEY \
AWS_SECRET_ACCESS_KEY=YOUR_SECRET \
aws s3 ls s3://your-bucket --endpoint-url https://s3.your-cluster.com
```

When I tested this against my own Ceph cluster, here is exactly what I saw:

```
2026-04-10 00:00:21         30 blog-test.txt
```

That is the file I wrote through s3fs, showing up in the bucket through a completely independent code path. The AWS CLI is talking directly to the Ceph RGW S3 API, which means s3fs is not in the picture at all. Two different tools, same file, same bucket. That is the proof that everything is working correctly.

You can also download the file content directly:

```bash
AWS_ACCESS_KEY_ID=YOUR_KEY \
AWS_SECRET_ACCESS_KEY=YOUR_SECRET \
aws s3 cp s3://your-bucket/test.txt - --endpoint-url https://s3.your-cluster.com
```

The `-` at the end tells the AWS CLI to print the content to stdout instead of saving to a file. If you see the same content you wrote earlier, congratulations, your setup is fully verified.

There is one more test you can do to be absolutely sure. Unmount the bucket, check the directory is empty, then remount and see if your file comes back. Like this:

```bash
sudo umount /mnt/my-bucket
ls /mnt/my-bucket          # should be empty

# Remount with the same command from Step 4
s3fs your-bucket /mnt/my-bucket -o passwd_file=~/.passwd-s3fs ...

ls /mnt/my-bucket          # should now show your file
```

If the file disappears when unmounted and reappears when remounted, that is the strongest possible proof that the file is actually living in object storage and not on local disk. This is exactly the test I ran during my own verification, and it worked perfectly.

## Step 7: Persist the mount across reboots with fstab

Mounting manually is fine for testing, but you do not want to do it after every reboot. Let us add it to `/etc/fstab` so the system mounts the bucket automatically at boot.

Open `/etc/fstab` with your favorite editor:

```bash
sudo nano /etc/fstab
```

Add this single line at the bottom:

```
my-bucket /mnt/my-bucket fuse.s3fs _netdev,allow_other,passwd_file=/home/youruser/.passwd-s3fs,url=https://s3.your-cluster.com,use_path_request_style 0 0
```

Two flags here are worth understanding:

- **`_netdev`** tells the operating system that this is a network filesystem and that it should wait for the network to be available before trying to mount. Without this flag, your system will try to mount the bucket too early in the boot process, before networking is up, and your boot will hang or fail. So this is not optional.
- **`allow_other`** lets users other than the one who mounted it access the directory. By default, FUSE mounts are visible only to the user who created them. If you want your web server, your cron jobs, or any other process to read from the mount, you need this flag.

Test that the fstab entry is correct without rebooting:

```bash
sudo mount -a
```

If this command runs without errors, your fstab entry is good. After the next reboot, your bucket will mount automatically.

## The performance reality check

This is the section nobody writes honestly, and I think that is a real disservice to people trying to choose the right tool. So let me tell you exactly what to expect.

- **Reads of small files:** Surprisingly fine, especially when you enable local caching with `-o use_cache=/tmp/s3fs-cache`. Files are cached on local disk after the first read, so repeated reads are basically free.
- **Sequential reads of large files:** This is where S3 really shines. Streaming a multi gigabyte file is very efficient because the data flows in a single uninterrupted stream.
- **Random writes:** Slow. Every write becomes a multipart upload behind the scenes. If your app writes to random offsets in a large file, you will feel the pain immediately.
- **Listing directories with thousands of files:** Painful. S3 does not have real directories, so listing a directory is actually a paginated API call that walks every prefix in the bucket. Thousands of files means thousands of API responses to process.
- **Renames:** Renames are expensive because S3 does not have a rename operation. A `mv` is actually a copy followed by a delete on the S3 side. Renaming a 5 GB file means re-uploading the entire 5 GB. Yes, really.
- **Append operations:** This one always shocks people. Appending to a file re-uploads the entire file every time. So if you have a log file that grows by a kilobyte per second, s3fs is going to re-upload the whole thing every time you write to it. Do not use s3fs for log files. Use a proper log shipper.

The general principle to remember is this. s3fs is filesystem on top of object storage. It is not block storage. The performance characteristics reflect that fact. If you need block storage performance, you actually need block storage. Use the right tool for the job.

## What you actually built

![Data flow when reading a file. App to mount point to s3fs daemon to object store](../../assets/diagrams/mount-s3-fuse-flow.svg)

Let me walk you through what happens when your application does a simple `cat /mnt/my-bucket/file.txt`:

1. Your app makes a normal `read` syscall to the kernel.
2. The kernel sees that the file path is inside a FUSE mount point.
3. The kernel hands the operation to the FUSE module.
4. FUSE forwards the request to the s3fs daemon running in user space.
5. The s3fs daemon translates this into an HTTP `GET` request against the S3 API.
6. The request goes over the network to your storage endpoint, whether it is Ceph RGW, MinIO, or AWS.
7. The endpoint returns the object data.
8. s3fs reads the response and passes the bytes back through FUSE to your application.

That is roughly five extra hops compared to reading from a local disk. This is the cost of the abstraction. Sometimes it is absolutely worth it because the alternative is rewriting your entire application. Sometimes it is not. You have to make that call based on your specific use case.

## Alternatives worth knowing about

s3fs is a very good default choice, but it is not the only option. Depending on your access pattern, one of these alternatives might be a better fit.

- **rclone mount:** More configurable than s3fs, supports over 50 different cloud backends, slightly different performance characteristics. This is my second favorite tool for this kind of work. If s3fs does not fit your needs, try rclone next.
- **goofys:** Faster than s3fs for some workloads but with fewer features. Less actively maintained these days. Worth knowing about but probably not your first choice.
- **JuiceFS:** Completely different architecture. JuiceFS keeps metadata in a separate database like Redis, which means listing directories and handling many small files is much faster. This is the serious option for production workloads with millions of small files.
- **AWS Mountpoint for S3:** Official AWS tool, AWS only. Optimized for read heavy workloads. If you are AWS only and need top performance, this is worth considering.
- **AWS S3 Files:** The new managed service from AWS. AWS only. Costs money, but you get full AWS support and integration with other AWS services.

The takeaway is simple. s3fs gets you about 80 percent of the way there for free, with zero infrastructure overhead. If you need the other 20 percent, pick the tool that matches your specific workload.

## When things go wrong

Before you start debugging, there are three commands that will save you a lot of time:

```bash
# Check if the mount is actually active
mount | grep fuse.s3fs

# Run s3fs in foreground mode with debug output to see what is happening
s3fs your-bucket /mnt/my-bucket -o ... -o dbglevel=info -f

# Force unmount if a mount gets stuck
sudo umount -l /mnt/my-bucket
```

The `-l` flag in the unmount command stands for "lazy unmount". It detaches the filesystem immediately and cleans up the references when nothing is using them anymore. This is your escape hatch when a mount gets into a bad state.

Now here are the most common problems and their causes:

- **"Permission denied" on credentials file.** You forgot the `chmod 600`. Run it again. This is the number one cause of s3fs failing to start.
- **Mount hangs forever.** Your endpoint URL is wrong or unreachable. Test the connection with `curl https://your-endpoint` first to confirm the network path is good.
- **"No such bucket" error.** The bucket does not exist on the backend. s3fs does not create buckets for you. Create the bucket first using your provider's console or CLI.
- **Files do not show up immediately after another machine writes them.** s3fs caches metadata aggressively for performance. Try `-o stat_cache_expire=10` to make the cache more responsive.
- **Mount disappears randomly without warning.** Usually a network blip or memory pressure. Check `dmesg` and `journalctl -xe` to find out what killed it.
- **Listing directories is painfully slow.** Enable local file caching with `-o use_cache=/tmp/s3fs-cache`. This makes a massive difference for read heavy workloads.
- **Mount works manually but fails on boot via fstab.** You forgot the `_netdev` flag. The system tried to mount before networking was up.

---

## Frequently Asked Questions

<details>
<summary>Can I use this with AWS S3 directly?</summary>

Yes, absolutely. You just skip the `url=` and `use_path_request_style` flags. Your AWS access key and secret go in the same `~/.passwd-s3fs` file. Everything else works the same way. s3fs already knows the AWS S3 endpoints by default, so you do not need to specify anything extra.

</details>

<details>
<summary>Is s3fs production ready?</summary>

For the right workloads, yes, absolutely. Many people run s3fs in production for backups, log shipping, legacy application integration, and shared storage across containers. The key phrase is "the right workloads". For databases, high frequency writes, or anything needing atomic operations, it will bite you eventually. Match the tool to the use case and you will be fine.

</details>

<details>
<summary>How does this compare to AWS S3 Files or Mountpoint for S3?</summary>

AWS S3 Files and Mountpoint for S3 are managed AWS services with proper support and tight integration with AWS native features like IAM, CloudWatch, and so on. If you are already deep in the AWS ecosystem and you want a fully supported solution, those are excellent choices.

s3fs is the open source alternative. It works with any S3-compatible backend, runs on any Linux machine, and costs nothing. If you are using Ceph, MinIO, Backblaze, or any non-AWS storage, s3fs is your friend. Even for AWS itself, s3fs works perfectly fine if you do not need vendor support.

Both approaches are valid. Pick based on your situation.

</details>

<details>
<summary>Will my legacy application work without any changes?</summary>

Mostly yes, but with some caveats. If your application does normal reads, writes, and directory listings, it will just work as if it were on a regular filesystem. If it does file locking, atomic renames, hard links, or random writes to large files, you should test thoroughly before committing. Most modern applications avoid those operations anyway, so you will probably be fine.

</details>

<details>
<summary>Does s3fs support encryption?</summary>

Yes. s3fs supports server side encryption using the `-o use_sse` flag. For AWS KMS, you use `-o use_sse=kmsid:KEY_ID` to specify which KMS key to use. For Ceph and MinIO, server side encryption is typically configured at the bucket level on the backend itself, and s3fs just respects whatever the backend does.

</details>

<details>
<summary>Can multiple servers mount the same bucket at the same time?</summary>

Yes, but you need to be careful about what you do with it. Multiple servers reading the same files works fine. Multiple servers writing to different files works fine. Multiple servers writing to the same file is asking for trouble because S3 has no file locking, so the last write wins and you can lose data.

If you need shared writable storage with proper coordination, look at JuiceFS instead. It is designed for that use case.

</details>

<details>
<summary>How do I unmount cleanly?</summary>

The standard way is:

```bash
sudo umount /mnt/my-bucket
```

If that hangs, which sometimes happens after a network issue, force it with the lazy unmount flag:

```bash
sudo umount -l /mnt/my-bucket
```

The lazy unmount detaches the filesystem immediately and cleans up references in the background. It is the safest way to recover from a stuck mount.

</details>

<details>
<summary>What happens to my data if the s3fs daemon crashes?</summary>

Data that has already been uploaded to the bucket is completely safe, because it is sitting in the object store. Data that was still in the local write buffer at the time of the crash is gone, because s3fs holds writes in memory until they are flushed to S3.

The mount point becomes inaccessible until you unmount and remount. This is exactly why you should never use s3fs as a database backend. Databases assume that writes are durable the moment they return from `write`. s3fs cannot make that promise.

</details>

<details>
<summary>How do I verify my mount actually works and is not silently failing?</summary>

Two ways. First, check the mount table:

```bash
mount | grep fuse.s3fs
```

If you see `s3fs on /mnt/my-bucket type fuse.s3fs ...`, the mount is real.

Second, write a file through the mount and then verify it exists in the bucket using a completely different S3 client. The AWS CLI works perfectly for this even against non-AWS endpoints:

```bash
aws s3 ls s3://your-bucket --endpoint-url https://your-endpoint
```

If you see your file in the listing, the mount is genuinely writing to S3 and not just to local disk. This is the strongest verification you can do.

</details>

---

If you are working with Ceph or any S3-compatible storage and need to manage users, buckets, or quotas programmatically from Node.js, I built a small SDK called [radosgw-admin](https://radosgw-admin.nycanshu.dev) for exactly that purpose. Zero dependencies, full TypeScript, and it works with any Ceph RGW deployment.
