import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import https from "https";

const s3 = new S3Client({});
const secretsClient = new SecretsManagerClient({});
const SPOTIFY_SECRET_ARN = process.env.SPOTIFY_SECRET_ARN;
const CONFIG_BUCKET = process.env.CONFIG_BUCKET;
const CONFIG_FILE = process.env.CONFIG_FILE;

const streamToString = async (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });

async function getSpotifyToken() {
  const secretRes = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: SPOTIFY_SECRET_ARN })
  );
  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = JSON.parse(secretRes.SecretString);
  const authString = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64");

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "accounts.spotify.com",
        path: "/api/token",
        method: "POST",
        headers: {
          Authorization: `Basic ${authString}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            resolve(json.access_token);
          } catch (err) {
            reject(err);
          }
        });
      }
    );
    req.on("error", reject);
    req.write("grant_type=client_credentials");
    req.end();
  });
}

async function getPlaylistTracks(token, playlistId) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.spotify.com",
        path: `/v1/playlists/${playlistId}/tracks?limit=100`,
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            if (json.error) {
              return reject(new Error(`Spotify API Error: ${json.error.message}`));
            }
            const items = Array.isArray(json.items) ? json.items : [];
            resolve(items);
          } catch (err) {
            reject(err);
          }
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

async function getTrackById(token, trackId) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.spotify.com",
        path: `/v1/tracks/${trackId}`,
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const t = JSON.parse(data);
            if (t.error) {
              return reject(new Error(`Spotify API Error: ${t.error.message}`));
            }
            const formatted = {
              title: t.name,
              artist: t.artists.map((a) => a.name).join(", "),
              composer: t.album?.label || "Unknown",
              year: t.album?.release_date?.split("-")[0] || "N/A",
              image: t.album?.images?.[0]?.url || "",
              spotify_url: t.external_urls.spotify,
            };
            resolve(formatted);
          } catch (err) {
            reject(err);
          }
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

async function getCuratedFromS3() {
  const res = await s3.send(
    new GetObjectCommand({ Bucket: CONFIG_BUCKET, Key: CONFIG_FILE })
  );
  const body = await streamToString(res.Body);
  return JSON.parse(body);
}

function formatTrack(track) {
  const t = track.track;
  return {
    title: t.name,
    artist: t.artists.map((a) => a.name).join(", "),
    composer: t.album?.label || "Unknown",
    year: t.album?.release_date?.split("-")[0] || "N/A",
    image: t.album?.images?.[0]?.url || "",
    spotify_url: t.external_urls.spotify,
  };
}

export const handler = async (event) => {
  console.log("Event path:", event.path);

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: JSON.stringify({ message: "CORS preflight OK" }) };
  }

  try {
    const path = event.path || "";
    const params = event.queryStringParameters || {};

    if (path.endsWith("/curated")) {
      const curated = await getCuratedFromS3();
      return { statusCode: 200, headers, body: JSON.stringify(curated) };
    }

    if (path.endsWith("/song")) {
      const playlistKey = params.playlist;
      if (!playlistKey)
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing playlist parameter" }) };

      const PLAYLISTS = {
        english: "2evMh8td9ke6CKFULUTYdh",
        hindi: "0ACUE87L7WFk2DgVhRSHQb",
        classical: "4A6P8UXesY5ugQWiDAg6Oa",
      };

      const playlistId = PLAYLISTS[playlistKey];
      if (!playlistId)
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid playlist category" }) };

      const token = await getSpotifyToken();
      const tracks = await getPlaylistTracks(token, playlistId);

      if (!tracks || tracks.length === 0)
        return { statusCode: 404, headers, body: JSON.stringify({ error: "No tracks found for this playlist." }) };

      const randomTrack = tracks[Math.floor(Math.random() * tracks.length)];
      const result = formatTrack(randomTrack);
      return { statusCode: 200, headers, body: JSON.stringify(result) };
    }

    if (path.endsWith("/track")) {
      const trackId = params.id;
      if (!trackId)
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing track ID" }) };

      const token = await getSpotifyToken();
      const track = await getTrackById(token, trackId);

      return { statusCode: 200, headers, body: JSON.stringify(track) };
    }

    return { statusCode: 404, headers, body: JSON.stringify({ message: "Not Found" }) };
  } catch (err) {
    console.error("Lambda Error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};

