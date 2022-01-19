const res = require("express/lib/response");
const path = require("path");

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
};
