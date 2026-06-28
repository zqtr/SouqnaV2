import { createWriteStream } from 'node:fs';
import { mkdir, readdir, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const uploadDir = path.join(root, 'uploads', 'videos');
const portArgIndex = process.argv.indexOf('--port');
const port =
  portArgIndex >= 0 && process.argv[portArgIndex + 1]
    ? Number.parseInt(process.argv[portArgIndex + 1], 10)
    : 4321;
const maxBytes = 2 * 1024 * 1024 * 1024;

function send(res, status, body, headers = {}) {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, {
    'content-type': typeof body === 'string' ? 'text/html; charset=utf-8' : 'application/json',
    'cache-control': 'no-store',
    ...headers,
  });
  res.end(payload);
}

function safeName(value) {
  const raw = decodeURIComponent(String(value || 'video-upload')).trim();
  const base = path.basename(raw).replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  const fallback = `video-${Date.now()}.mp4`;
  return base || fallback;
}

function page() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Video Upload</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f7f4ef; color: #241b14; }
    main { width: min(560px, calc(100vw - 32px)); padding: 24px; border: 1px solid #dfd2bf; border-radius: 12px; background: #fffaf4; box-shadow: 0 16px 48px rgba(31, 22, 12, .12); }
    h1 { margin: 0 0 8px; font-size: 24px; line-height: 1.1; font-weight: 650; }
    p { margin: 0 0 18px; color: #6e6257; line-height: 1.5; }
    label { display: grid; gap: 8px; font-size: 14px; font-weight: 600; }
    input { padding: 12px; border: 1px solid #d5c7b7; border-radius: 8px; background: #fff; font: inherit; }
    button { margin-top: 14px; width: 100%; padding: 12px 14px; border: 0; border-radius: 8px; background: #241b14; color: #fffaf4; font: inherit; font-weight: 700; cursor: pointer; }
    button:disabled { opacity: .55; cursor: progress; }
    progress { width: 100%; height: 14px; margin-top: 14px; accent-color: #9b742f; }
    pre { white-space: pre-wrap; overflow-wrap: anywhere; margin: 14px 0 0; padding: 12px; border-radius: 8px; background: #f0e7db; color: #2c2118; font-size: 13px; }
    a { color: #6f4d13; font-weight: 700; }
  </style>
</head>
<body>
  <main>
    <h1>Upload a video</h1>
    <p>The file saves locally into <code>uploads/videos</code> for frame-by-frame analysis.</p>
    <form id="form">
      <label>
        Video file
        <input id="file" type="file" accept="video/*" required />
      </label>
      <button id="button" type="submit">Upload video</button>
      <progress id="progress" max="100" value="0" hidden></progress>
      <pre id="status">Waiting for a video.</pre>
    </form>
    <p style="margin-top:16px"><a href="/files">View uploaded files</a></p>
  </main>
  <script>
    const form = document.querySelector('#form');
    const fileInput = document.querySelector('#file');
    const button = document.querySelector('#button');
    const progress = document.querySelector('#progress');
    const status = document.querySelector('#status');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const file = fileInput.files[0];
      if (!file) return;
      button.disabled = true;
      progress.hidden = false;
      progress.value = 0;
      status.textContent = 'Uploading ' + file.name + '...';
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/upload?name=' + encodeURIComponent(file.name));
      xhr.setRequestHeader('content-type', file.type || 'application/octet-stream');
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) progress.value = Math.round((event.loaded / event.total) * 100);
      };
      xhr.onload = () => {
        button.disabled = false;
        if (xhr.status >= 200 && xhr.status < 300) {
          const body = JSON.parse(xhr.responseText);
          progress.value = 100;
          status.textContent = 'Saved: ' + body.path + '\\nSize: ' + body.bytes + ' bytes';
        } else {
          status.textContent = 'Upload failed: ' + xhr.responseText;
        }
      };
      xhr.onerror = () => {
        button.disabled = false;
        status.textContent = 'Upload failed: network error.';
      };
      xhr.send(file);
    });
  </script>
</body>
</html>`;
}

async function listFiles() {
  await mkdir(uploadDir, { recursive: true });
  const names = await readdir(uploadDir);
  const rows = await Promise.all(
    names.map(async (name) => {
      const filePath = path.join(uploadDir, name);
      const info = await stat(filePath);
      return { name, bytes: info.size, modifiedAt: info.mtime.toISOString() };
    }),
  );
  return rows.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    if (req.method === 'GET' && url.pathname === '/') return send(res, 200, page());
    if (req.method === 'GET' && url.pathname === '/files') return send(res, 200, { files: await listFiles() });
    if (req.method !== 'POST' || url.pathname !== '/upload') return send(res, 404, { error: 'not_found' });

    const contentLength = Number.parseInt(req.headers['content-length'] || '0', 10);
    if (!Number.isFinite(contentLength) || contentLength <= 0) {
      return send(res, 400, { error: 'missing_body' });
    }
    if (contentLength > maxBytes) {
      return send(res, 413, { error: 'too_large', maxBytes });
    }

    await mkdir(uploadDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${timestamp}-${safeName(url.searchParams.get('name'))}`;
    const outputPath = path.join(uploadDir, filename);
    await pipeline(req, createWriteStream(outputPath, { flags: 'wx' }));
    send(res, 200, {
      ok: true,
      file: filename,
      bytes: contentLength,
      path: path.relative(root, outputPath).replaceAll(path.sep, '/'),
    });
  } catch (error) {
    send(res, 500, { error: 'server_error', message: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Video upload server listening on http://127.0.0.1:${port}`);
  console.log(`Saving uploads to ${uploadDir}`);
});
