const GITHUB_API = 'https://api.github.com';
const REPO = process.env.GITHUB_REPO || 'fanfer/fanfer';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const TOKEN = process.env.GITHUB_TOKEN || '';

class GitHubApiError extends Error {
  constructor(status, body) {
    super(`GitHub API ${status}: ${body}`);
    this.name = 'GitHubApiError';
    this.status = status;
    this.body = body;
  }
}

function encodeRepoPath(repoPath) {
  return repoPath.split('/').map(encodeURIComponent).join('/');
}

function contentsUrl(repoPath, ref = BRANCH) {
  return `${GITHUB_API}/repos/${REPO}/contents/${encodeRepoPath(repoPath)}${ref ? `?ref=${encodeURIComponent(ref)}` : ''}`;
}

function requestHeaders(useToken, extra = {}) {
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    ...extra,
  };
  if (useToken && TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  if (!useToken) {
    delete headers.Authorization;
    delete headers.authorization;
  }
  return headers;
}

async function ghFetch(url, opts = {}, options = {}) {
  const method = (opts.method || 'GET').toUpperCase();
  const allowAnonymousRead = options.allowAnonymousRead !== false && ['GET', 'HEAD'].includes(method);
  const extraHeaders = opts.headers || {};

  let res = await fetch(url, {
    ...opts,
    headers: requestHeaders(Boolean(TOKEN), extraHeaders),
  });

  if (!res.ok && TOKEN && allowAnonymousRead && (res.status === 401 || res.status === 403)) {
    res = await fetch(url, {
      ...opts,
      headers: requestHeaders(false, extraHeaders),
    });
  }

  if (!res.ok) {
    throw new GitHubApiError(res.status, await res.text());
  }

  return res;
}

async function getFile(repoPath, options = {}) {
  const res = await ghFetch(contentsUrl(repoPath), {}, options);
  const data = await res.json();
  return {
    content: Buffer.from(data.content, 'base64').toString('utf8'),
    sha: data.sha,
  };
}

async function listDir(repoPath, options = {}) {
  const res = await ghFetch(contentsUrl(repoPath), {}, options);
  return res.json();
}

async function putFile(repoPath, content, sha, message, isBase64 = false) {
  const body = {
    message: message || `admin: update ${repoPath}`,
    content: isBase64 ? content : Buffer.from(content, 'utf8').toString('base64'),
    branch: BRANCH,
  };
  if (sha) body.sha = sha;

  const res = await ghFetch(contentsUrl(repoPath, ''), {
    method: 'PUT',
    body: JSON.stringify(body),
  }, { allowAnonymousRead: false });
  return res.json();
}

async function deleteFile(repoPath, sha, message) {
  const res = await ghFetch(contentsUrl(repoPath, ''), {
    method: 'DELETE',
    body: JSON.stringify({
      message: message || `admin: delete ${repoPath}`,
      sha,
      branch: BRANCH,
    }),
  }, { allowAnonymousRead: false });
  return res.json();
}

function cleanBody(body) {
  try {
    const parsed = JSON.parse(body);
    return parsed.message || body;
  } catch {
    return body;
  }
}

function sendGitHubError(res, err, notFoundMessage = 'Not found') {
  if (!(err instanceof GitHubApiError)) return false;
  if (err.status === 404) {
    res.status(404).json({ error: notFoundMessage });
    return true;
  }
  if (err.status === 401 || err.status === 403) {
    res.status(502).json({
      error: 'GitHub token is missing or invalid. Update GITHUB_TOKEN in Vercel to enable admin changes.',
    });
    return true;
  }
  res.status(502).json({ error: `GitHub API ${err.status}: ${cleanBody(err.body)}` });
  return true;
}

module.exports = {
  BRANCH,
  GitHubApiError,
  REPO,
  deleteFile,
  getFile,
  listDir,
  putFile,
  sendGitHubError,
};
