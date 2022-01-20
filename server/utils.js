const res = require("express/lib/response");
const path = require("path");
const crypto = require("crypto");

const { Octokit, App } = require("octokit");
const { resolve } = require("path");
const { contentType } = require("express/lib/response");
const { useCssVars } = require("vue");
const { isBigInt64Array } = require("util/types");

function envIntElse(key, def) {
  const env = process.env[key];
  if (env === undefined) return def;
  const parsed = parseInt(env);
  if (isNaN(parsed)) return def;
  return parsed;
}

const gitToken = process.env.EXPRESSMIN_GITHUB_TOKEN;

const octokit = new Octokit({ auth: gitToken });

let gitUser = "browsercapturesalt";
const gitMail =
  "browsercaptures@googlemail.com" || process.env.EXPRESSMIN_GIT_MAIL;
const gitRepo = "blobs" || process.env.EXPRESSMIN_BLOBS_REPO;

const cryptoAlgorithm =
  process.env.EXPRESSMIN_CRYPTO_ALGORITHM || "aes-256-cbc";
const ivLength = envIntElse("EXPRESSMIN_IV_LENGTH", 16);
const secretKeyLength = envIntElse("EXPRESSMIN_SECRET_KEY_LENGTH", 32);
const secretKey = Buffer.alloc(secretKeyLength);
const secret = process.env.EXPRESSMIN_SECRET_KEY || gitToken;
Buffer.from(secret, "utf8").copy(secretKey);
const encryptEncoding = "base64";

function encrypt(content, inputEncoding) {
  const outputEncoding = encryptEncoding;
  const iv = crypto.randomBytes(ivLength);

  const cipher = crypto.createCipheriv(cryptoAlgorithm, secretKey, iv);

  const encrypted =
    cipher.update(content, inputEncoding, outputEncoding) +
    cipher.final(outputEncoding);

  const ivEncB64 = iv.toString(outputEncoding) + " " + encrypted;

  console.log({ ivEncB64 });

  return ivEncB64;
}

function decrypt(content, outputEncoding) {
  const inputEncoding = encryptEncoding;

  const [ivB64, encB64] = content.split(" ");

  const iv = Buffer.from(ivB64, inputEncoding);

  const decipher = crypto.createDecipheriv(cryptoAlgorithm, secretKey, iv);

  const decrypted =
    decipher.update(encB64, inputEncoding, outputEncoding) + decipher.final();

  return decrypted;
}

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
            content: Buffer.from(content.data.content, "base64"),
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

function createOrupdateGitContent(path, contentBuffer, sha) {
  const content = contentBuffer.toString("base64");
  const message = `Update ${path}`;
  return new Promise((resolve) => {
    try {
      octokit.rest.repos
        .createOrUpdateFileContents({
          owner: gitUser,
          repo: gitRepo,
          path,
          message,
          content,
          sha,
          "committer.name": gitUser,
          "committer.email": gitMail,
          "author.name": gitUser,
          "author.email": gitMail,
        })
        .then((result) => {
          resolve(result);
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

function upsertGitContent(path, contentBuffer) {
  return new Promise((resolve) => {
    getGitContent(path).then((content) => {
      if (content.error) {
        createOrupdateGitContent(path, contentBuffer).then((result) =>
          resolve(result)
        );
      } else {
        createOrupdateGitContent(path, contentBuffer, content.sha).then(
          (result) => resolve(result)
        );
      }
    });
  });
}

function getGitContentDec(path) {
  return new Promise((resolve) => {
    getGitContent(path).then((result) => {
      if (result.error) {
        resolve(result);
      } else {
        result.content = decrypt(result.content.toString());
        resolve(result);
      }
    });
  });
}

function getGitContentJsonDec(path) {
  return new Promise((resolve) => {
    getGitContentDec(path).then((result) => {
      if (result.error) {
        resolve(result);
      } else {
        result.content = JSON.parse(result.content.toString());
        resolve(result);
      }
    });
  });
}

function upsertGitContentEnc(path, contentBuffer) {
  return upsertGitContent(path, Buffer.from(encrypt(contentBuffer)));
}

function upsertGitContentJsonEnc(path, blob) {
  return upsertGitContentEnc(path, Buffer.from(JSON.stringify(blob)));
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
  getGitContentDec,
  getGitContentJsonDec,
  upsertGitContent,
  upsertGitContentEnc,
  upsertGitContentJsonEnc,
  init,
  encrypt,
  decrypt,
};
