const basicAuth = require("basic-auth");

module.exports = function(req, res, next) {
  const user = basicAuth(req);

  if (!user ||
      user.name !== process.env.ADMIN_USER ||
      user.pass !== process.env.ADMIN_PASS) {

    res.set("WWW-Authenticate", 'Basic realm="Admin Area"');
    return res.status(401).send("Acesso negado");
  }

  next();
};
