(function (global) {
  if (typeof exports === "object" && typeof module !== "undefined") {
    module.exports = factory();
  } else if (typeof define === "function" && define.amd) {
    define([], factory);
  } else {
    var g;
    if (typeof window !== "undefined") {
      g = window;
    } else if (typeof global !== "undefined") {
      g = global;
    } else if (typeof self !== "undefined") {
      g = self;
    } else {
      g = this;
    }
    g.base64js = factory();
  }
})(this, function () {
  "use strict";

  // The module loader function (UMD style)
  function __commonJS(modules) {
    var installedModules = {};
    function require(moduleId) {
      if (installedModules[moduleId]) {
        return installedModules[moduleId].exports;
      }
      var module = installedModules[moduleId] = {
        exports: {}
      };
      modules[moduleId][0].call(
        module.exports,
        function (x) {
          var id = modules[moduleId][1][x];
          return require(id || x);
        },
        module,
        module.exports
      );
      return module.exports;
    }
    return require;
  }

  // Our base64-js module (using the key "/" for our module)
  var base64Module = __commonJS({
    "/": [function (require, module, exports) {
      "use strict";
      
      // Helper: parse the base64 string header information
      function byteLength(str) {
        var len = str.length;
        if (len % 4 > 0) {
          throw new Error("Invalid string. Length must be a multiple of 4");
        }
        var pos = str.indexOf("=");
        if (pos === -1) {
          pos = len;
        }
        var extraBytes = pos === len ? 0 : 4 - pos % 4;
        return [pos, extraBytes];
      }
      
      // Calculate output length given base64 string info
      function calcOutputLength(str, pos, extraBytes) {
        return (3 * (pos + extraBytes) / 4) - extraBytes;
      }
      
      // Convert a base64 string to a byte array
      function toByteArray(str) {
        var info = byteLength(str);
        var pos = info[0];
        var extraBytes = info[1];
        var outLen = calcOutputLength(str, pos, extraBytes);
        var out = new Uint8Array(outLen);
        var curByte = 0;
        var len = pos;
        var i;
        for (i = 0; i < len; i += 4) {
          var tmp = (lookup[str.charCodeAt(i)] << 18) |
                    (lookup[str.charCodeAt(i + 1)] << 12) |
                    (lookup[str.charCodeAt(i + 2)] << 6) |
                    (lookup[str.charCodeAt(i + 3)]);
          out[curByte++] = (tmp >> 16) & 0xff;
          out[curByte++] = (tmp >> 8) & 0xff;
          out[curByte++] = tmp & 0xff;
        }
        if (extraBytes === 2) {
          var tmp = (lookup[str.charCodeAt(i)] << 2) |
                    (lookup[str.charCodeAt(i + 1)] >> 4);
          out[curByte++] = tmp & 0xff;
        }
        if (extraBytes === 1) {
          var tmp = (lookup[str.charCodeAt(i)] << 10) |
                    (lookup[str.charCodeAt(i + 1)] << 4) |
                    (lookup[str.charCodeAt(i + 2)] >> 2);
          out[curByte++] = (tmp >> 8) & 0xff;
          out[curByte++] = tmp & 0xff;
        }
        return out;
      }
      
      // Encode 24 bits into 4 base64 characters
      function encodeChunk(num) {
        return (
          encodeLookup[(num >> 18) & 0x3f] +
          encodeLookup[(num >> 12) & 0x3f] +
          encodeLookup[(num >> 6) & 0x3f] +
          encodeLookup[num & 0x3f]
        );
      }
      
      // Convert a byte array to a base64 encoded string
      function fromByteArray(uint8) {
        var len = uint8.length;
        var extraBytes = len % 3; // if we have 1 byte left, pad 2 '='s; 2 bytes, pad 1 '='
        var parts = [];
        var maxChunkLength = 16383;
        var i;
        for (i = 0; i < len - extraBytes; i += maxChunkLength) {
          parts.push(encodeChunkForSlice(uint8, i, i + maxChunkLength > len - extraBytes ? len - extraBytes : i + maxChunkLength));
        }
        if (extraBytes === 1) {
          var tmp = uint8[len - 1];
          parts.push(encodeLookup[tmp >> 2] +
                     encodeLookup[(tmp << 4) & 0x3f] +
                     "==");
        } else if (extraBytes === 2) {
          var tmp = (uint8[len - 2] << 8) + uint8[len - 1];
          parts.push(encodeLookup[tmp >> 10] +
                     encodeLookup[(tmp >> 4) & 0x3f] +
                     encodeLookup[(tmp << 2) & 0x3f] +
                     "=");
        }
        return parts.join("");
      }
      
      // Helper: encode a slice of the byte array
      function encodeChunkForSlice(uint8, start, end) {
        var output = "";
        for (var i = start; i < end; i += 3) {
          var tmp = ((uint8[i] << 16) & 0xff0000) +
                    ((uint8[i + 1] << 8) & 0xff00) +
                    (uint8[i + 2] & 0xff);
          output += encodeChunk(tmp);
        }
        return output;
      }
      
      // Export functions
      exports.byteLength = function (str) {
        var info = byteLength(str);
        return calcOutputLength(str, info[0], info[1]);
      };
      exports.toByteArray = toByteArray;
      exports.fromByteArray = fromByteArray;
      
      // Build lookup tables
      var encodeLookup = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("");
      var lookup = [];
      for (var i = 0; i < encodeLookup.length; i++) {
        lookup[encodeLookup[i].charCodeAt(0)] = i;
      }
      lookup[45] = 62;
      lookup[95] = 63;
      
    }, {}]
  });
  
  return base64Module("/");
});
