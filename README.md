# redis-status

A node module that checks the health of a Redis server, suitable for use by a
service's "health" route.

## Installation

```js
npm install redis-status --save
```

## Usage

```js
var express = require('express');
var router = express.Router();

// Construct a `RedisStatus` object configured to check the status of
// the Redis server named 'foo' at `redis//localhost:6379`.
var fooStatus = require('redis-status')({
  name: 'foo',
  port: 6379,
  host: 'localhost'
});

// If 'foo' is healthy, this route will print 'great'; otherwise it will print
// the reason that 'foo' is not healthy. A monitoring service like Webmon or
// Pingdom can raise non-'great' responses as alerts.
router.get('/health', function(req, res) {
  fooStatus.checkStatus(function(err) {
    res.send(err || 'great');
  });
});
```

## Contributing

We welcome pull requests! Please lint your code.

## Release History

* 1.0.3 Connect to Redis only to check the status and then disconnect.
* 1.0.2 Keep a persistent connection to Redis.
* 1.0.1 Fix typo and clean up documentation.
* 1.0.0 Initial release.