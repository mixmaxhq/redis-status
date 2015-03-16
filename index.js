var redis = require('redis');

/**
 * Creates a `RedisStatus` object configured to check the status of the specified Redis server.
 *
 * @param {object} config
 *    @property {string} name - An arbitrary name for the server, included in error messages.
 *    @property {int} port - The port of the Redis server to which to connect.
 *    @property {string} host - The host of the Redis server to which to connect.
 *    @property {string=} password - (Optional) The password of the Redis server to which to connect.
 *      Defaults to none.
 *    @property {number=} memoryThreshold - (Optional) The maximum amount of memory which the Redis
 *      server is expected to use when healthy:
 *        - If you use Redis as an LRU cache, set this to the value of the server's `maxmemory`
 *          configuration directive.
 *        - If you use Redis for pub/sub, set this (via observation) to the amount of memory used by
 *          the server 's runtime operations (most likely something like 10MB).
 *        - Leave this unset if your Redis deployment is autoscaled.
 *      Defaults to none.
 */
function RedisStatus(config) {
  if (!(this instanceof RedisStatus)) {
    return new RedisStatus(config);
  }

  this._name = config.name;
  this._port = config.port;
  this._host = config.host;
  this._password = config.password;
  this._memoryThreshold = config.memoryThreshold;
}

/**
 * Checks the status of the Redis server.
 *
 * The server is considered healthy if:
 *    - it is reachable;
 *    - and if the server is using less memory than is specified by this object's memory threshold
 *      (if a threshold was specified when this object was created).
 *
 * @param {function<string=>} callback - A function to call with the status: `undefined` if the
 *    server is healthy, or a string describing the reason that the server is unhealthy.
 */
RedisStatus.prototype.checkStatus = function(callback) {
  var redisClient = redis.createClient(this._port, this._host, {
    auth_pass: this._password
  }).on('error', function() {
    // If Redis is not responsive, `node_redis` will emit an error on the next turn of the event
    // loop. If we don't provide an error handler, that error will bring down the process. Providing
    // an error handler will cause `node_redis` to begin attempting to reconnect--but the ping below
    // will force the matter.
  });

  var closingCallback = function() {
    redisClient.quit();
    callback.apply(null, arguments);
  };

  // Ensure that our Redis instance is responsive.
  var self = this;
  redisClient.ping(function(err, pong) {
    if (err || (pong !== 'PONG')) {
      closingCallback(self._name + ' Redis instance is not responsive.');
      return;
    }

    if (!self._memoryThreshold) {
      closingCallback(); // Success.
    } else {
      redisClient.info('memory', function(err, info) {
        if (err) {
          closingCallback(self._name + ' Redis instance is not responsive.');
          return;
        }

        // '# Memory\r\nused_memory:1086352…' -> ['# Memory', 'used_memory:1086352'] ->
        // 'used_memory:1086352' -> ['used_memory', '1086352'] -> 1086352
        var usedMemory = parseInt(info.split('\r\n')[1].split(':')[1]);
        if (usedMemory > self._memoryThreshold) {
          closingCallback(self._name + ' Redis instance is using abnormally high memory.');
        } else {
          closingCallback(); // Success.
        }
      });
    }
  });
};

module.exports = RedisStatus;