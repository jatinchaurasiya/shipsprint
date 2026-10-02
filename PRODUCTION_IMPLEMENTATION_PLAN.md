# ShipSprint — AWS EC2 Production Hosting & Ground Work Master Plan

**Document Version:** 3.0.0  
**Status:** Ground Work & Infrastructure Blueprint · No Code Changes  
**Date:** October 1, 2026  

---

## 1. Server Sizing & Capacity Analysis: `t3.micro` vs `t3.small`

### 1.1 How Many Users Can a 1 GB EC2 Instance Serve?
Because ShipSprint is built with **Next.js Standalone Mode** + **Caddy Edge Proxy** and offloads the database to **Supabase Cloud** and media to **Cloudflare R2**, the server does **not** run PostgreSQL or store static media files.

#### Memory Allocation on a 1 GB `t3.micro`:
| Component | Runtime RAM Consumption | Notes |
| :--- | :--- | :--- |
| **Ubuntu 24.04 LTS (Minimal OS)** | ~90 – 120 MB | Lean kernel + systemd |
| **Caddy Reverse Proxy (Go)** | ~30 – 45 MB | HTTP/2, HTTP/3, TLS termination |
| **Next.js 16 Standalone (Node.js)** | ~140 – 190 MB | Pruned production build |
| **Total Base Memory Footprint** | **~260 – 355 MB** | **Leaves ~650 MB free RAM** |
| **2 GB Swap Space (Disk)** | Emergency headroom | Prevents any Out-Of-Memory (OOM) crash |

#### Estimated Serving Capacity:
* **Public Tenant Landing Pages (Published Sites):**
  - Next.js serves lightweight HTML/CSS with client hydration islands.
  - Caddy + Next.js will comfortably serve **150 – 250 requests/second (RPS)**.
  - This equals **~10,000 to 25,000 daily page visits** without breaking a sweat.
* **Concurrent Active App Editors (Logged in users modifying sites):**
  - **30 to 50 concurrent active editors** editing and saving simultaneously.
* **CPU Credits & Burstable Performance:**
  - `t3.micro` gives 2 vCPUs and earns 24 CPU credits per hour. For typical indie SaaS traffic, the CPU runs at 5–15% and credit balance stays maxed out at 576 credits, ready for traffic spikes.

---

### 1.2 Which One Should You Pick? `t3.micro` vs `t3.small`

| Feature | `t3.micro` (Recommended to Start) | `t3.small` (Future Upgrade) |
| :--- | :--- | :--- |
| **Pricing** | **100% FREE** (AWS Free Tier, 750 hrs/mo) | ~$15 / month (~$0.0208/hr) |
| **vCPU** | 2 vCPUs (Burstable) | 2 vCPUs (Burstable, higher baseline) |
| **RAM** | 1 GB (+ 2 GB swapfile) | 2 GB (+ 2 GB swapfile) |
| **Direct On-Server Docker Builds** | Slower (leverages swapfile) | Fast & effortless |
| **Daily Visitor Capacity** | ~15,000 – 25,000 visits/day | ~50,000 – 100,000 visits/day |
| **Concurrent Active Editors** | ~40 concurrent users | ~120+ concurrent users |

> [!TIP]
> **Recommendation:** Start with **`t3.micro` (100% Free)**.  
> In AWS EC2, you can resize an instance from `t3.micro` to `t3.small` in **under 60 seconds** with 1 click without losing your Elastic IP, database, or settings when your traffic scales!

---

## 2. Cloudflare DNS Configuration (For `shipsprint.site`)

Since you added `shipsprint.site` to Cloudflare, you get faster DNS resolution and DDoS protection.

### 2.1 Critical Cloudflare Setting: "DNS Only" (Grey Cloud)
For Caddy on your EC2 instance to issue automated on-demand SSL certificates via Let's Encrypt for both `*.shipsprint.site` and custom domains (`userdomain.com`), Caddy must be directly reachable on Port 80 and 443.

In your **Cloudflare Dashboard** -> `shipsprint.site` -> **DNS** -> **Records**:

| Type | Name | Content / Target | Proxy Status | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **`A`** | `@` | `<YOUR_AWS_ELASTIC_IP>` | **DNS Only (Grey Cloud)** | Root domain (`shipsprint.site`) |
| **`A`** | `*` | `<YOUR_AWS_ELASTIC_IP>` | **DNS Only (Grey Cloud)** | Wildcard subdomains (`*.shipsprint.site`) |
| **`A`** | `cname` | `<YOUR_AWS_ELASTIC_IP>` | **DNS Only (Grey Cloud)** | CNAME target for user custom domains |

> [!IMPORTANT]
> Keep the Proxy Status as **DNS Only (Grey Cloud)** for `@`, `*`, and `cname`.  
> If you turn on the Orange Cloud (Proxied) for wildcard `*`, Cloudflare will block Caddy's ACME TLS challenge unless you pay $10/mo for Cloudflare Advanced Certificate Manager. Grey cloud lets Caddy issue free certificates directly!

---

## 3. Step-by-Step AWS EC2 Setup & Deployment Guide

### Step 1: Launch your AWS EC2 Instance
1. Open the [AWS EC2 Console](https://console.aws.amazon.com/ec2).
2. Click **Launch instance**.
3. **Name:** `shipsprint-production`.
4. **OS Image:** Select **Ubuntu** -> **Ubuntu Server 24.04 LTS (HVM), SSD Volume Type**.
5. **Instance Type:** Select **`t3.micro`** (or `t2.micro` depending on your AWS region Free Tier availability).
6. **Key Pair (Login):**
   - Click **Create new key pair**.
   - Name: `shipsprint-key`.
   - Key pair type: **RSA**, format: **`.pem`**.
   - Download and save `shipsprint-key.pem` on your PC (e.g. `C:\Users\Admin\.ssh\shipsprint-key.pem`).
7. **Network Settings (Firewall / Security Group):**
   - Select **Create security group**.
   - Check:
     - [x] **Allow SSH traffic from** -> `My IP` (or `Anywhere 0.0.0.0/0`)
     - [x] **Allow HTTPS traffic from the internet** -> Port 443 (`0.0.0.0/0`)
     - [x] **Allow HTTP traffic from the internet** -> Port 80 (`0.0.0.0/0`)
8. **Configure Storage:** Change size from 8 GiB to **20 GiB** (AWS Free Tier includes up to 30 GiB of gp3 SSD storage).
9. Click **Launch instance**.

---

### Step 2: Allocate & Attach an AWS Elastic IP (Fixed Public IP)
By default, EC2 public IPs change whenever an instance is stopped or restarted. An Elastic IP is **permanent** and **100% free** while attached to a running instance.

1. In the EC2 Console left navigation, under **Network & Security**, click **Elastic IPs**.
2. Click **Allocate Elastic IP address** (top-right).
3. Leave defaults (Amazon's pool of IPv4 addresses) and click **Allocate**.
4. Select the newly allocated Elastic IP from the list.
5. Click **Actions** -> **Associate Elastic IP address**.
6. **Resource type:** Select **Instance**.
7. **Instance:** Click the dropdown and select your running `shipsprint-production` instance.
8. Click **Associate**.
9. **Copy your Elastic IP address** (e.g., `54.215.18.92`).
10. Put this Elastic IP address into your **Cloudflare DNS** as described in Section 2!

---

### Step 3: Connect to EC2 & Provision the Server

1. Open PowerShell or Terminal on your PC where your `shipsprint-key.pem` is located:
   ```powershell
   ssh -i "path\to\shipsprint-key.pem" ubuntu@<YOUR_ELASTIC_IP>
   ```
2. **Update the Operating System:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y git curl ufw
   ```
3. **Configure the 2 GB Swapfile (Crucial for 1 GB RAM stability):**
   ```bash
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```
   *(Verify swap with `free -h` — you will see `Swap: 2.0Gi`)*.

4. **Install Docker & Docker Compose:**
   ```bash
   sudo apt install -y docker.io docker-compose-v2
   sudo systemctl enable docker
   sudo systemctl start docker
   sudo usermod -aG docker $USER
   ```
   *(Log out and log back in by typing `exit`, then reconnect via SSH so Docker group permissions take effect)*.

5. **Configure Firewall (UFW):**
   ```bash
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw --force enable
   ```

---

### Step 4: Clone Repository & Configure Environment

1. **Clone the ShipSprint repository:**
   ```bash
   git clone https://github.com/jatinchaurasiya/shipsprint.git ~/shipsprint
   cd ~/shipsprint
   ```

2. **Create the production environment file:**
   ```bash
   nano .env.production
   ```
   *(Or `nano .env.local`)*.

3. **Paste your production credentials:**
   ```env
   # App URLs
   NEXT_PUBLIC_ROOT_DOMAIN=shipsprint.site
   NEXT_PUBLIC_APP_URL=https://shipsprint.site

   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=https://mhkrbkyeixtacpbabbeh.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

   # Dodo Payments
   DODO_PAYMENTS_API_KEY=live_...
   DODO_PAYMENTS_WEBHOOK_KEY=whsec_...
   DODO_PAYMENTS_ENVIRONMENT=live_mode

   # Cloudflare R2
   R2_ACCOUNT_ID=...
   R2_ACCESS_KEY_ID=...
   R2_SECRET_ACCESS_KEY=...
   R2_BUCKET_NAME=shipsprint-assets
   R2_PUBLIC_DOMAIN=assets.shipsprint.site

   # Security & Infra
   CRON_SECRET=                      # openssl rand -hex 32
   CNAME_TARGET_HOST=cname.shipsprint.site
   DOMAIN_VERIFY_PREFIX=_shipverify
   ACME_CONTACT_EMAIL=your-email@gmail.com
   ```
   Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).

---

### Step 5: Start ShipSprint with Docker Compose

Your repository already includes a production-grade [`Dockerfile`](Dockerfile), [`docker-compose.yml`](docker-compose.yml), and [`infra/Caddyfile`](infra/Caddyfile).

Run the startup command:
```bash
docker compose up -d --build
```

#### What Happens Automatically:
1. Docker builds the Next.js 16 standalone container.
2. Caddy boots on Port 80 & 443.
3. When a request hits `https://shipsprint.site` or `https://test.shipsprint.site`:
   - Caddy automatically contacts Let's Encrypt / ZeroSSL, generates a valid HTTPS TLS certificate, and proxies traffic to Next.js on port 3000.
   - When a custom domain (e.g. `clientdomain.com`) arrives, Caddy calls Next.js `/api/caddy/ask` to verify domain ownership before provisioning certificates on the fly!

To check container health:
```bash
docker compose ps
docker compose logs -f caddy
```

---

## 4. Zero-Downtime Updates Workflow

Whenever you push new code to GitHub in the future, updating the live server takes one simple command:

```bash
cd ~/shipsprint
git pull origin main
docker compose up -d --build
```
Docker will build the updated Next.js app in the background and swap the running container instantly with zero downtime.
