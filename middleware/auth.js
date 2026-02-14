const basicAuth = require("basic-auth");

module.exports = function(req, res, next) {
  const user = basicAuth(req);

  // ✅ CORRIGIDO: ADMIN_USERNAME e ADMIN_PASSWORD (consistente com upload.js)
  if (!user ||
      user.name !== process.env.ADMIN_USERNAME ||
      user.pass !== process.env.ADMIN_PASSWORD) {

    res.set("WWW-Authenticate", 'Basic realm="Admin Area"');
    return res.status(401).send("Acesso negado");
  }

  next();
};