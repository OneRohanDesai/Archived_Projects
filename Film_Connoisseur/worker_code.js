export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    const method = request.method

    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,x-api-key"
    }

    function isAuthorized(request) {
      const key = request.headers.get("x-api-key")
      return key && key === env.ADMIN_SECRET
    }

    if (url.pathname.startsWith("/posters/")) {
      const key = url.pathname.replace("/posters/", "")

      const cache = caches.default
      const cacheKey = new Request(request.url)

      let response = await cache.match(cacheKey)
      if (response) return response

      const object = await env.BUCKET.get("posters/" + key)
      if (!object) return new Response("Not found", { status: 404 })

      response = new Response(object.body, {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=31536000, immutable"
        }
      })

      ctx.waitUntil(cache.put(cacheKey, response.clone()))
      return response
    }

    if (method === "OPTIONS") {
      return new Response(null, { headers: cors })
    }

    if (url.pathname === "/verify" && method === "POST") {
      const body = await request.json()

      if (body.password === env.ADMIN_SECRET) {
        return Response.json({ ok: true }, { headers: cors })
      }

      return new Response("Unauthorized", { status: 403 })
    }

    if (url.pathname === "/movies" && method === "GET") {
      const cache = caches.default
      const cacheKey = new Request(request.url)

      let response = await cache.match(cacheKey)
      if (response) return response

      const { results } = await env.DB
        .prepare("SELECT * FROM movies ORDER BY rank ASC")
        .all()

      const parsed = results.map(m => ({
        ...m,
        ratings: safeParse(m.ratings),
        weights: safeParse(m.weights)
      }))

      response = new Response(JSON.stringify({ movies: parsed }), {
        headers: {
          ...cors,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=60, s-maxage=120"
        }
      })

      ctx.waitUntil(cache.put(cacheKey, response.clone()))
      return response
    }

    if (url.pathname.startsWith("/movies/") && method === "GET") {
      const id = url.pathname.split("/")[2]

      const cache = caches.default
      const cacheKey = new Request(request.url)

      let response = await cache.match(cacheKey)
      if (response) return response

      const movie = await env.DB
        .prepare("SELECT * FROM movies WHERE id = ?")
        .bind(id)
        .first()

      const parsed = {
        ...movie,
        ratings: safeParse(movie.ratings),
        weights: safeParse(movie.weights)
      }

      response = new Response(JSON.stringify(parsed), {
        headers: {
          ...cors,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300, s-maxage=600"
        }
      })

      ctx.waitUntil(cache.put(cacheKey, response.clone()))
      return response
    }

    if (url.pathname === "/search" && method === "GET") {
      const q = url.searchParams.get("q")?.toLowerCase() || ""

      const cache = caches.default
      const cacheKey = new Request(request.url)

      let response = await cache.match(cacheKey)
      if (response) return response

      const { results } = await env.DB.prepare(`
        SELECT * FROM movies 
        WHERE LOWER(title) LIKE ? OR LOWER(director) LIKE ?
      `).bind(`%${q}%`, `%${q}%`).all()

      const parsed = results.map(m => ({
        ...m,
        ratings: safeParse(m.ratings),
        weights: safeParse(m.weights)
      }))

      response = new Response(JSON.stringify({ movies: parsed }), {
        headers: {
          ...cors,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=30, s-maxage=60"
        }
      })

      ctx.waitUntil(cache.put(cacheKey, response.clone()))
      return response
    }

    if (url.pathname === "/movies" && method === "POST") {

      if (!isAuthorized(request)) {
        return new Response("Unauthorized", { status: 403 })
      }

      const body = await request.json()

      const id = crypto.randomUUID().slice(0, 8)

      const final_score = Object.keys(body.ratings)
        .reduce((sum, k) => sum + body.ratings[k] * body.weights[k], 0)

      await env.DB.prepare(`
        INSERT INTO movies 
        (id, title, year, director, poster_url, ratings, weights, final_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id,
        body.title,
        body.year,
        body.director,
        body.poster_url,
        JSON.stringify(body.ratings),
        JSON.stringify(body.weights),
        final_score,
        new Date().toISOString()
      ).run()

      await rerank(env)
      await purgeCache()

      return Response.json({ success: true }, { headers: cors })
    }

    if (url.pathname.startsWith("/movies/") && method === "DELETE") {

      if (!isAuthorized(request)) {
        return new Response("Unauthorized", { status: 403 })
      }

      const id = url.pathname.split("/")[2]

      const movie = await env.DB
        .prepare("SELECT * FROM movies WHERE id = ?")
        .bind(id)
        .first()

      if (movie) {
        const key = movie.poster_url.split("/").pop()
        await env.BUCKET.delete("posters/" + key)
      }

      await env.DB.prepare("DELETE FROM movies WHERE id = ?")
        .bind(id).run()

      await rerank(env)
      await purgeCache()

      return Response.json({ success: true }, { headers: cors })
    }

    if (url.pathname === "/upload" && method === "POST") {

      if (!isAuthorized(request)) {
        return new Response("Unauthorized", { status: 403 })
      }

      const formData = await request.formData()
      const file = formData.get("file")

      const key = "posters/" + crypto.randomUUID() + ".jpg"

      await env.BUCKET.put(key, file.stream())

      return Response.json({
        poster_url: `https://cdn.film-connoisseur.rohandesai.in/${key}`
      }, { headers: cors })
    }

    return new Response("Not found", { status: 404 })
  }
}

function safeParse(str) {
  try {
    return JSON.parse(str || "{}")
  } catch {
    return {}
  }
}

async function rerank(env) {
  const { results } = await env.DB
    .prepare("SELECT id, final_score FROM movies")
    .all()

  const sorted = results.sort((a, b) => b.final_score - a.final_score)

  for (let i = 0; i < sorted.length; i++) {
    await env.DB.prepare(
      "UPDATE movies SET rank = ? WHERE id = ?"
    ).bind(i + 1, sorted[i].id).run()
  }
}

async function purgeCache() {}