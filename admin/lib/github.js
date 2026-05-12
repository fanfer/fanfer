const GITHUB_API = 'https://api.github.com';
const REPO = process.env.GITHUB_REPO || 'fanfer/fanfer';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const TOKEN = process.env.GITHUB_TOKEN;

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: 'application/vnd.github.v3+json',
  'Content-Type': 'application/json',
};

async function ghFetch(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API ${res.status}: ${body}`);
  }
  return res;
}

async function getFile(path) {
  const res = await ghFetch(`${GITHUB_API}/repos/${REPO}/contents/${encodeURIComponent(path)}?ref=${BRANCH}`);
  const data = await res.json();
  const content = Buffer.from(data.content, 'base64').toString('utf8');
  return { content, sha: data.sha };
}

async function putFile(path, content, sha, message, isBase64 = false) {
  const body = {
    message: message || `admin: update ${path}`,
    content: isBase64 ? content : Buffer.from(content, 'utf8').toString('base64'),
    branch: BRANCH,
  };
  if (sha) body.sha = sha;

  const res = await ghFetch(`${GITHUB_API}/repos/${REPO}/contents/${encodeURIComponent(path)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return res.json();
}

async function deleteFile(path, sha, message) {
  const res = await ghFetch(`${GITHUB_API}/repos/${REPO}/contents/${encodeURIComponent(path)}`, {
    method: 'DELETE',
    body: JSON.stringify({
      message: message || `admin: delete ${path}`,
      sha,
      branch: BRANCH,
    }),
  });
  return res.json();
}

async function listDir(dirPath) {
  const res = await ghFetch(`${GITHUB_API}/repos/${REPO}/contents/${encodeURIComponent(dirPath)}?ref=${BRANCH}`);
  return res.json();
}

module.exports = { getFile, putFile, deleteFile, listDir, REPO, BRANCH };
