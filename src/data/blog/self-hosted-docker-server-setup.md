---
title: "I Built My Own Mini Cloud on a Single VM and Here's What Actually Matters"
description: "A practical walkthrough of running multiple backend apps, a shared PostgreSQL database, and a reverse proxy on one VM using Docker and the concepts that make it all click."
pubDatetime: 2026-04-04T00:00:00+05:30
featured: false
tags:
  - docker
  - self-hosted
  - linux
  - devops
  - nginx
  - postgresql
  - backend
---

This is not another "how to install Docker" tutorial. There are enough of those.

This is about what I actually set up, why each piece exists, and the mental model you need so you're not just copy-pasting commands and hoping nothing breaks.

By the end you'll have multiple backend apps running on one VM, talking to a shared PostgreSQL database, accessible via real domain names, from anywhere on the internet. And more importantly you'll understand *why* it works.

## What we're building

![Mini cloud architecture — Internet to Nginx to Apps to PostgreSQL](../../assets/diagrams/mini-cloud-overview.svg)

One entry point. Multiple services. Shared infrastructure. This is exactly how real systems are structured just without the AWS bill.

## What you need

**A VM with a public IP.** Oracle Free Tier works. AWS EC2 works. Your old laptop with port forwarding technically works but let's not do that.

**A domain name.** You need to be able to point DNS records at your VM's IP. Free domains exist if you don't want to spend money yet.

**Basic Linux comfort.** Not expert level just "I know what `sudo` means and I'm not scared of the terminal."

That's it. You don't need to know Docker deeply. That's the point of this post.

## Step 1: Connect to your VM

```bash
ssh username@your-vm-ip
```

If this fails, your VM provider has a console you can use. Fix your SSH keys first becasue everything else depends on this.

## Step 2: Open firewall ports

This is where most people waste hours. Your VM probably blocks ports 80 and 443 by default.

**Oracle Cloud:** Go to your VCN → Security Lists → add ingress rules for ports 80, 443, and 81 (for Nginx admin). Also run:

```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 81 -j ACCEPT
sudo netfilter-persistent save
```

**AWS EC2:** Edit your Security Group → add inbound rules for ports 80, 443, 81 from `0.0.0.0/0`.

**Other providers:** Check their firewall docs. If you skip this, everything will look correct but nothing will be reachable from outside. You'll question your life choices. Don't skip this.

## Step 3: Install Docker

Docker is the engine that runs everything. One install, done.

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

**Important:** `usermod` doesn't take effect in your current session. You need to log out and SSH back in. Or run `newgrp docker` as a quick fix — but a fresh login is more reliable.

Verify it works:

```bash
docker run hello-world
```

If you get "permission denied", you didn't log out and back in. Do that.

Then install Docker Compose:

```bash
sudo apt install docker-compose-plugin -y
```

Docker Compose is how you define and run multiple services together. You'll use it for every piece of this setup.

## Step 4: Project structure

Don't dump everything in one folder. Seriously.

```bash
mkdir -p ~/mini-cloud/{infra,apps,database}
cd ~/mini-cloud
```

```
mini-cloud/
 ├── infra/      # reverse proxy lives here
 ├── apps/       # your backend services
 └── database/   # postgres
```

When something breaks at 11pm, you want to know exactly which folder to look in. This structure pays for itself the first time you need to debug.

## Step 5: Create a shared Docker network

This is the most important concept in this whole post and the one most tutorials gloss over.

By default, Docker containers are isolated and they can't see each other. A Docker network is a **private internal network** where containers can discover and talk to each other using their service names as hostnames.

Without this: your app can't reach your database. Your reverse proxy can't reach your apps. Nothing works.

```bash
docker network create my-network
```

One command. Now every container you connect to `my-network` can reach every other container by name. `postgres`, `app1`, `app2`, they all just work as hostnames.

This is the same concept as Kubernetes' internal DNS, just without the YAML.

## Step 6: Set up PostgreSQL

```bash
cd ~/mini-cloud/database
```

Create `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:15
    container_name: postgres
    restart: always
    environment:
      POSTGRES_USER: admin #CHANGE ME
      POSTGRES_PASSWORD: secret #CHANGE ME
      POSTGRES_DB: postgres
    volumes:
      - ./data:/var/lib/postgresql/data
    networks:
      - my-network

networks:
  my-network:
    external: true
```

The volume line is important:

```yaml
./data:/var/lib/postgresql/data
```

Left side: folder on your VM. Right side: where Postgres stores its data inside the container. This means your data lives on the host machine, not inside the container. Container dies, restarts, or gets deleted. Your data is still there.

This is the same idea as a Persistent Volume in Kubernetes, just without the abstraction layer.

Start it:

```bash
docker compose up -d
```

## Step 7: Deploy your apps

Here's where most people do it wrong. They clone their GitHub repo on the server and run it directly. Don't.

The right approach:

1. Build your Docker image locally
2. Push it to Docker Hub (free)
3. Pull and run it on the VM

```bash
# On your dev machine
docker build -t yourusername/app1:latest .
docker push yourusername/app1:latest
```

Why bother? Because this is how you solve "works on my machine" permanently. The image you tested is the exact image running in production. No surprises.

`docker-compose.yml` for your app:

```yaml
services:
  app1:
    image: yourusername/app1:latest
    container_name: app1
    restart: always
    environment:
      DB_HOST: postgres
      DB_USER: admin
      DB_PASSWORD: secret
    networks:
      - my-network

networks:
  my-network:
    external: true
```

Notice `DB_HOST: postgres`. That's the container name from Step 5. Docker resolves it automatically. No IP addresses, no hardcoded hosts. This is the Docker network doing its job.

## Step 8: Set up Nginx Proxy Manager

Without a reverse proxy, your apps are only accessible as `your-ip:3000`, `your-ip:4000`, etc. That's fine for testing. It's embarrassing for anything else.

Nginx Proxy Manager gives you a UI to route `app1.yourdomain.com` → your app container, with SSL handled automatically. No hand-editing nginx config files.

```bash
cd ~/mini-cloud/infra
```

```yaml
services:
  nginx:
    image: jc21/nginx-proxy-manager:latest
    container_name: nginx
    restart: always
    ports:
      - "80:80"
      - "81:81"
      - "443:443"
    volumes:
      - ./data:/data
      - ./letsencrypt:/etc/letsencrypt
    networks:
      - my-network

networks:
  my-network:
    external: true
```

Port `81` is the admin UI. After starting it, open `http://your-vm-ip:81` to configure routing.

**Default login credentials:**
- Email: `admin@example.com`
- Password: `changeme`

It'll ask you to change these on first login. If you're wondering why login isn't working this is why. Everyone forgets the default creds.

```bash
docker compose up -d
```

## Step 9: Point your DNS

In your domain provider:

```
app1.yourdomain.com  →  A record  →  your-vm-ip
app2.yourdomain.com  →  A record  →  your-vm-ip
```

Both subdomains point to the same IP. Nginx figures out which app to send traffic to based on the hostname.

**DNS takes time to propagate.** Anywhere from 5 minutes to 48 hours depending on your provider. If everything is set up correctly but the domain doesn't resolve wait. Use `dig app1.yourdomain.com` to check if the record has propagated before panicking.

## Step 10: Configure routing in Nginx

In the Nginx Proxy Manager UI:

- **Domain:** `app1.yourdomain.com`
- **Forward Hostname:** `app1` (the container name)
- **Forward Port:** whatever port your app listens on

Click "Request SSL" it handles Let's Encrypt automatically. Your app is now live on HTTPS.

## What you actually built

![Full request flow — Browser to DNS to Nginx to containers to Postgres](../../assets/diagrams/mini-cloud-flow.svg)

Break it down:

- **Docker** — runs your services as isolated containers
- **Docker Network** — lets containers find and talk to each other by name
- **Volumes** — keep your data alive independent of containers
- **Nginx** — single entry point that routes traffic based on domain
- **DNS** — maps friendly names to your VM's IP

These four concepts map directly to real production systems. Kubernetes adds orchestration, Ceph adds distributed storage, Prometheus adds observability but the foundation is identical to what you just built.

## What to do next

Once this feels comfortable:

- **k3s** — lightweight Kubernetes if you want to learn orchestration without a 3-node cluster
- **Ceph** — when host-mounted volumes aren't enough and you need real distributed storage
- **Grafana + Loki** — when `docker logs` starts feeling inadequate

But honestly, start with what you just built. Run it for a week. Break something. Fix it. The foundation matters more than the stack on top of it.

## When things go wrong

Before you start debugging, learn these three commands:

```bash
# Are my containers actually running?
docker ps

# What's happening inside a container?
docker logs app1 --tail 50

# Can containers reach each other?
docker exec app1 ping postgres
```

90% of problems fall into one of these:

- **Container not running** — `docker ps` shows nothing. Check `docker logs <name>` for the crash reason.
- **Containers can't talk** — they're not on the same Docker network. Run `docker network inspect my-network` and verify both containers are listed.
- **App can't reach database** — you're using `localhost` instead of `postgres` as the DB host. Inside Docker, `localhost` means "this container," not your VM.
- **Site not reachable from internet** — firewall ports aren't open. Go back to Step 2.
- **Domain not working** — DNS hasn't propagated. Run `dig yourdomain.com` and check if it returns your VM's IP.
- **SSL certificate fails** — ports 80/443 must be open for Let's Encrypt verification. Also make sure DNS is pointing to the right IP.

---

## FAQ

<details>
<summary>Do I need to clone my repo on the server?</summary>

No. Build your Docker image locally, push to Docker Hub, pull on the server. This keeps your server clean and ensures the exact image you tested is what runs in production. Your server doesn't need git, Node.js, Java, or any build tools.

</details>

<details>
<summary>Can I run multiple apps on different ports without Nginx?</summary>

Technically yes — `your-ip:3000`, `your-ip:4000`, etc. But no SSL, no domain names, and you're exposing individual ports to the internet. Nginx is the right way.

</details>

<details>
<summary>What happens if my VM restarts?</summary>

All services with `restart: always` will come back automatically. Your data is safe because it's in mounted volumes on the host, not inside the containers.

</details>

<details>
<summary>How do I update a running app?</summary>

Push a new image to Docker Hub, then on the server:

```bash
docker compose pull
docker compose up -d
```

That's it. The old container is replaced with the new one. Zero downtime if you're quick about it.

</details>

<details>
<summary>Can I use MySQL instead of PostgreSQL?</summary>

Yes. Replace the postgres image with `mysql:8` and change the environment variables. The Docker network and volume concepts are identical.

</details>

<details>
<summary>How much RAM/CPU do I need?</summary>

For 2-3 small apps + Postgres + Nginx: 2GB RAM and 1 vCPU is enough. Oracle Free Tier gives you this for free. If you're running heavier apps, 4GB is more comfortable.

</details>

<details>
<summary>Is this production-ready?</summary>

For personal projects, side projects, MVPs — absolutely. For a startup with real users, you'll eventually want backups, monitoring, log aggregation, and probably Kubernetes. But this foundation is how many real products start.

</details>

<details>
<summary>How do I back up my database?</summary>

```bash
docker exec postgres pg_dump -U admin appdb > backup.sql
```

Run this on a cron job. Store the backup somewhere that isn't the same VM — an S3 bucket, another machine, anywhere else.

</details>
