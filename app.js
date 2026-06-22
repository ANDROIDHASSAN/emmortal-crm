/**
 * Phusion Passenger startup file (MilesWeb cPanel "Setup Node.js App").
 *
 * Passenger runs this file with `node app.js`. The server entry is an ES module, so we
 * load it via dynamic import. The Express app calls app.listen(env.PORT); Passenger
 * provides PORT and proxies the public domain to it.
 *
 * In cPanel → Setup Node.js App, set "Application startup file" = app.js (this file).
 */
import('./server/src/server.js').catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[passenger] failed to boot server', err);
  process.exit(1);
});
