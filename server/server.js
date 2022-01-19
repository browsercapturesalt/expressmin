const express = require("express");
const utils = require("./utils");

const PORT = utils.envIntElse("PORT", 3000);
const API_BASE_URL = "/api";

const APP_NAME = process.env.APP_NAME || "expressmin";

const app = express();

const api = express.Router();

app.use(API_BASE_URL, api);

const SERVER_STARTED_AT = Date.now();
const INDEX_TITLE = "Express Min";

api.get("/init", (req, res) => {
  utils.sendJson(res, { SERVER_STARTED_AT, INDEX_TITLE });
});

app.get("/", (req, res) => {
  utils.sendView(res, "index.html");
});

app.get("/vue.js", (req, res) => {
  utils.sendModule(res, "vue/dist/vue.global.prod.js");
});

app.get("/utils.js", (req, res) => {
  utils.sendView(res, "utils.js");
});

utils.init().then((utilsInitOk) => {
  console.log({ utilsInitOk });

  app.listen(PORT, () => {
    console.log(`${APP_NAME} listening at ${PORT}`);
  });

  /*utils.upsertGitContent("test", Buffer.from("test update")).then((result) => {
    console.log(result);
  });*/
});
