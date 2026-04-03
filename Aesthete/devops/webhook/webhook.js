const https = require("https");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { CodePipelineClient, StartPipelineExecutionCommand } = require("@aws-sdk/client-codepipeline");

const s3 = new S3Client({});
const cp = new CodePipelineClient({});

const DEST_BUCKET = process.env.SOURCE_BUCKET;
const PIPELINE_NAME = process.env.PIPELINE_NAME;

function downloadToBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(downloadToBuffer(res.headers.location));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download ${url}, status ${res.statusCode}`));
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", (err) => reject(err));
    }).on("error", reject);
  });
}

exports.handler = async (event) => {
  console.log("Webhook invoked", JSON.stringify(event).slice(0, 1500));
  try {
    const body = event.body ? JSON.parse(event.body) : (event);
    const archiveUrl = body.archive_url || body.tarball_url || (body.repo && body.repo.archive_url);
    const commitId = body.sha || body.commit || (body.after) || Date.now().toString();

    if (!archiveUrl) {
      console.error("No archive_url found in payload", body);
      return { statusCode: 400, body: "No archive_url in payload" };
    }

    const key = `aesthete-${commitId}.zip`;
    console.log(`Downloading ${archiveUrl} => ${key}`);

    const buf = await downloadToBuffer(archiveUrl);

    await s3.send(new PutObjectCommand({
      Bucket: DEST_BUCKET,
      Key: key,
      Body: buf,
      ContentType: "application/zip"
    }));

    console.log(`Uploaded to s3://${DEST_BUCKET}/${key}`);

    await cp.send(new StartPipelineExecutionCommand({ name: PIPELINE_NAME }));

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, s3Key: key })
    };
  } catch (err) {
    console.error("Webhook handler error", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

