const res = require("express/lib/response");
const path = require("path");

const { Octokit, App } = require("octokit");

const octokit = new Octokit({ auth: process.env.EXPRESSMIN_GITHUB_TOKEN });

let gitUser = "browsercapturesalt";
const gitRepo = "blobs" || process.env.BLOBS_REPO;

function init() {
  return new Promise((resolve) => {
    octokit.rest.users.getAuthenticated().then((account) => {
      gitUser = account.data.login;
      console.log({ gitUser });

      resolve(true);
    });
  });
}

function getGitContent(path) {
  return new Promise((resolve) => {
    try {
      octokit.rest.repos
        .getContent({
          owner: gitUser,
          repo: gitRepo,
          path,
        })
        .then((content) => {
          resolve({
            content: Buffer.from(content.data.content, "base64").toString(
              "utf-8"
            ),
            sha: content.data.sha,
          });
        })
        .catch((error) => {
          resolve({ error });
        });
    } catch (error) {
      resolve({ error });
    }
  });
  return;
}

function envIntElse(key, def) {
  const env = process.env[key];
  if (env === undefined) return def;
  const parsed = parseInt(env);
  if (isNaN(parsed)) return def;
  return parsed;
}

function sendView(res, name) {
  res.sendFile(path.join(__dirname, "..", "views", name));
}

function sendModule(res, name) {
  res.sendFile(path.join(__dirname, "..", "node_modules", name));
}

function sendJson(res, blob) {
  res.send(JSON.stringify(blob));
}

module.exports = {
  envIntElse,
  sendView,
  sendJson,
  sendModule,
  getGitContent,
  init,
};
