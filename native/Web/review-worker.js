/* Full-source offline review on a worker; user code is only parsed, never run. */
'use strict';
self.window = self;
importScripts('syntax.js', 'checker.js', 'malwatch.js', 'vendor/acorn.js', 'vendor/php-parser.js', 'vendor/babel-parser.js', 'review-engine.js');
self.postMessage({ ready: true });
self.onmessage = function (event) {
  var request = event.data;
  try { self.postMessage({ id: request.id, result: ReviewEngine.local(request.code, request.language) }); }
  catch (error) { self.postMessage({ id: request.id, error: error.message }); }
};
