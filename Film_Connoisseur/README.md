# 🎞️ Film Connoisseur

---

**Live Site:** [https://www.film-connoisseur.rohandesai.in](https://www.film-connoisseur.rohandesai.in)

NOTE: Latest version of this project is live at above domain

This README is not updated, additional things are built but not added in this README file as this project is terminated now forever.

Also entire infra is shifted to cloudflare, everything from AWS is migrated to cloudflare - storage, workers, etc.

---

**Film Connoisseur** is a premium movie-ranking and gallery platform built to showcase only the finest films - beautifully presented, intelligently scored, and served entirely serverlessly.

Dive into a curated world of cinema, where every frame counts.

---

This entire list is a personal ranking — not based on global reviews or popularity charts. It reflects my own love for the art of cinema. The collection is far from complete; I (Ladybug) still have countless masterpieces left to discover. If you’d like to suggest a film for me to watch, rank, and add, feel free to email me or use the suggestion bar on the site!

Scores are based purely on artistic qualities like direction, cinematography, story, acting, and sound. Great films transcend language, nationality, budget, genre, and era — so this list is proudly worldwide.

Everyone experiences films differently, so if you disagree with any ranking, just enjoy the list as one person’s viewpoint rather than a universal verdict.

---

## 🧠 Overview

Film Connoisseur is a full-stack web application featuring:

- **Elegant Film Gallery** — browse films, view posters, open rich detail popups  
- **Dynamic Ranked List** — sorted live using a computed weighted score  
- **Secure Admin Dashboard** — password-protected movie uploader  
- **Fully Serverless Backend** — powered by AWS Lambda, API Gateway, DynamoDB, and S3

---

## 🧩 System Architecture

**Frontend**  
Static HTML, CSS, and JavaScript hosted on S3 with a luxury maroon-velvet theme.

**Storage**  
- S3 stores poster images and frontend assets.

**Database**  
- DynamoDB holds metadata, ratings, computed scores, and ranking info.

**Logic Layer**  
- Lambda functions handle uploads, scoring, ranking, and password validation.

**API Layer**  
- API Gateway provides REST endpoints with full CORS support.

**Content Delivery**  
- CloudFront distributes assets globally with aggressive caching.

**Security**  
- The admin page (`add.html`) requires API key + password verification.

---

## ⚙️ Features

### 🎥 Gallery (`index.html`)
- Displays all films with uniform poster layout.
- Clicking a poster opens a detail popup containing the computed score breakdown.

### 🏅 Ranked List (`ranked.html`)
- Dynamically sorted by final weighted score.
- Popups display granular scoring for Story, Direction, Cinematography, and more.

### 🔒 Add Movie (`add.html`)
- Access controlled via `/verify` password route.  
- Password is cached locally for the session.  
- Uploads posters via S3 presigned URL.  
- Lambda computes weighted score and updates database + rankings automatically.  
- Form resets on success.

### 📊 Scoring Formula
Each film’s **Final Score** =  
```

Σ (rating × weight)

```
Weights are user-adjustable for attributes such as Story, Direction, Acting, etc.

---

## 🧱 AWS Setup

### DynamoDB — `Movies` Table

| Field | Description |
|-------|-------------|
| **pk** | Partition key (`MOVIE#<id>`) |
| **sk** | Sort key (`META`) |
| **title** | Movie title |
| **year** | Release year |
| **director** | Director name |
| **poster_url** | S3 image URL |
| **ratings** | Rating vector |
| **weights** | Weight vector |
| **final_score** | Computed score |
| **rank** | Global ranking |
| **created_at** | Timestamp |

---

### Lambda Functions

| Function | Purpose |
|----------|---------|
| `addMovie` | Adds a film, computes score, updates ranks |
| `getMovies` | Returns all films for gallery display |
| `getRankedMovies` | Returns films sorted by score |
| `getPresignedUrl` | Generates S3 upload URL |
| `verifyPassword` | Validates admin password securely |

---

### API Gateway Routes

```

GET  /movies          → fetch all films
POST /movies          → add a new film
GET  /presigned-url   → request poster upload URL
POST /verify          → password validation

```

All routes include:

```

Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET,POST,OPTIONS
Access-Control-Allow-Headers: Content-Type,Authorization,X-Api-Key

````

---

### S3 Bucket Policy (Public Read)

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::film-connoisseur.1ladybug.com/*"
  }]
}
````

---

### CloudFront CDN

* **Origin:** `film-connoisseur.1ladybug.com.s3.amazonaws.com`
* **Compression:** Enabled
* **Caching:** `public, max-age=31536000, immutable`
* **Custom Domain:** `cdn.film-connoisseur.1ladybug.com`

---

## 🧰 Local Development

### 1. Clone the repository

```sh
git clone https://git.sr.ht/~yourusername/film-connoisseur
cd film-connoisseur
```

### 2. Set your API base URL

```html
<script>
  const API_BASE = 'https://<api-id>.execute-api.<region>.amazonaws.com/prod';
</script>
```

### 3. Upload to S3

```sh
aws s3 sync . s3://film-connoisseur.1ladybug.com --delete
```

### 4. Invalidate CloudFront cache

```sh
aws cloudfront create-invalidation \
  --distribution-id <ID> \
  --paths "/*"
```

---

## 🧑‍💻 Security & Access

* Admin access requires a server-side password stored in AWS.
* Password validated via Lambda before exposing form.
* Client stores password only in `localStorage`.
* Credentials can be rotated anytime via **Secrets Manager**.

---

## 🖼️ Performance & Optimization

* CloudFront’s global edge delivery ensures fast load times everywhere.
* Posters stored at **600×900 (2:3)** for consistent presentation.
* Lazy loading boosts initial performance.
* Immutable caching makes return visits nearly instant.

---

## 🚀 Deployment Summary

| Service                  | Purpose                    |
| ------------------------ | -------------------------- |
| **S3 (static)**          | Hosts HTML/CSS/JS          |
| **Lambda + API Gateway** | Backend compute & REST API |
| **DynamoDB**             | Data persistence           |
| **S3 (posters)**         | Poster storage             |
| **CloudFront**           | CDN + SSL                  |
| **Secrets Manager**      | Password management        |

---

## 🏁 Status

* ✔️ Production-ready
* ✔️ Secure and optimized
* ✔️ 100% serverless

🌐 **Live Site:** [https://www.film-connoisseur.rohandesai.in](https://www.film-connoisseur.rohandesai.in)

---

## 🪄 Author

**Rohan Desai | Ladybug**
✨ Built out of pure love for the art of cinema.

---

## 📜 License

Released under the **MIT License** — feel free to use and adapt with attribution.

---