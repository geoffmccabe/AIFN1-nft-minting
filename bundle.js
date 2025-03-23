"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require2() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // ../../../../node_modules/base64-js/index.js
  var require_base64_js = __commonJS({
    "../../../../node_modules/base64-js/index.js"(exports) {
      "use strict";
      exports.byteLength = byteLength;
      exports.toByteArray = toByteArray;
      exports.fromByteArray = fromByteArray2;
      var lookup = [];
      var revLookup = [];
      var Arr = typeof Uint8Array !== "undefined" ? Uint8Array : Array;
      var code = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
      for (i = 0, len = code.length; i < len; ++i) {
        lookup[i] = code[i];
        revLookup[code.charCodeAt(i)] = i;
      }
      var i;
      var len;
      revLookup["-".charCodeAt(0)] = 62;
      revLookup["_".charCodeAt(0)] = 63;
      function getLens(b64) {
        var len2 = b64.length;
        if (len2 % 4 > 0) {
          throw new Error("Invalid string. Length must be a multiple of 4");
        }
        var validLen = b64.indexOf("=");
        if (validLen === -1) validLen = len2;
        var placeHoldersLen = validLen === len2 ? 0 : 4 - validLen % 4;
        return [validLen, placeHoldersLen];
      }
      function byteLength(b64) {
        var lens = getLens(b64);
        var validLen = lens[0];
        var placeHoldersLen = lens[1];
        return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
      }
      function _byteLength(b64, validLen, placeHoldersLen) {
        return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
      }
      function toByteArray(b64) {
        var tmp;
        var lens = getLens(b64);
        var validLen = lens[0];
        var placeHoldersLen = lens[1];
        var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen));
        var curByte = 0;
        var len2 = placeHoldersLen > 0 ? validLen - 4 : validLen;
        var i2;
        for (i2 = 0; i2 < len2; i2 += 4) {
          tmp = revLookup[b64.charCodeAt(i2)] << 18 | revLookup[b64.charCodeAt(i2 + 1)] << 12 | revLookup[b64.charCodeAt(i2 + 2)] << 6 | revLookup[b64.charCodeAt(i2 + 3)];
          arr[curByte++] = tmp >> 16 & 255;
          arr[curByte++] = tmp >> 8 & 255;
          arr[curByte++] = tmp & 255;
        }
        if (placeHoldersLen === 2) {
          tmp = revLookup[b64.charCodeAt(i2)] << 2 | revLookup[b64.charCodeAt(i2 + 1)] >> 4;
          arr[curByte++] = tmp & 255;
        }
        if (placeHoldersLen === 1) {
          tmp = revLookup[b64.charCodeAt(i2)] << 10 | revLookup[b64.charCodeAt(i2 + 1)] << 4 | revLookup[b64.charCodeAt(i2 + 2)] >> 2;
          arr[curByte++] = tmp >> 8 & 255;
          arr[curByte++] = tmp & 255;
        }
        return arr;
      }
      function tripletToBase64(num) {
        return lookup[num >> 18 & 63] + lookup[num >> 12 & 63] + lookup[num >> 6 & 63] + lookup[num & 63];
      }
      function encodeChunk(uint8, start, end) {
        var tmp;
        var output = [];
        for (var i2 = start; i2 < end; i2 += 3) {
          tmp = (uint8[i2] << 16 & 16711680) + (uint8[i2 + 1] << 8 & 65280) + (uint8[i2 + 2] & 255);
          output.push(tripletToBase64(tmp));
        }
        return output.join("");
      }
      function fromByteArray2(uint8) {
        var tmp;
        var len2 = uint8.length;
        var extraBytes = len2 % 3;
        var parts = [];
        var maxChunkLength = 16383;
        for (var i2 = 0, len22 = len2 - extraBytes; i2 < len22; i2 += maxChunkLength) {
          parts.push(encodeChunk(uint8, i2, i2 + maxChunkLength > len22 ? len22 : i2 + maxChunkLength));
        }
        if (extraBytes === 1) {
          tmp = uint8[len2 - 1];
          parts.push(
            lookup[tmp >> 2] + lookup[tmp << 4 & 63] + "=="
          );
        } else if (extraBytes === 2) {
          tmp = (uint8[len2 - 2] << 8) + uint8[len2 - 1];
          parts.push(
            lookup[tmp >> 10] + lookup[tmp >> 4 & 63] + lookup[tmp << 2 & 63] + "="
          );
        }
        return parts.join("");
      }
    }
  });

  // helpers.js
  var helpers_exports = {};
  __export(helpers_exports, {
    ChannelID: () => ChannelID,
    ColorSpace: () => ColorSpace,
    Compression: () => Compression,
    LayerMaskFlags: () => LayerMaskFlags,
    MOCK_HANDLERS: () => MOCK_HANDLERS,
    MaskParams: () => MaskParams,
    RAW_IMAGE_DATA: () => RAW_IMAGE_DATA,
    clamp: () => clamp,
    createCanvas: () => createCanvas,
    createCanvasFromData: () => createCanvasFromData,
    createEnum: () => createEnum,
    createImageData: () => createImageData,
    decodeBitmap: () => decodeBitmap,
    fromBlendMode: () => fromBlendMode,
    hasAlpha: () => hasAlpha,
    imageDataToCanvas: () => imageDataToCanvas,
    initializeCanvas: () => initializeCanvas2,
    largeAdditionalInfoKeys: () => largeAdditionalInfoKeys,
    layerColors: () => layerColors,
    offsetForChannel: () => offsetForChannel,
    resetImageData: () => resetImageData,
    revMap: () => revMap,
    toBlendMode: () => toBlendMode,
    writeDataRLE: () => writeDataRLE,
    writeDataRaw: () => writeDataRaw,
    writeDataZipWithoutPrediction: () => writeDataZipWithoutPrediction
  });
  function revMap(map) {
    const result = {};
    Object.keys(map).forEach((key) => result[map[key]] = key);
    return result;
  }
  function createEnum(prefix, def, map) {
    const rev = revMap(map);
    const decode = (val) => {
      const value = val.split(".")[1];
      if (value && !rev[value])
        throw new Error(`Unrecognized value for enum: '${val}'`);
      return rev[value] || def;
    };
    const encode = (val) => {
      if (val && !map[val]) throw new Error(`Invalid value for enum: '${val}'`);
      return `${prefix}.${map[val] || map[def]}`;
    };
    return { decode, encode };
  }
  function offsetForChannel(channelId, cmyk) {
    switch (channelId) {
      case ChannelID.Color0:
        return 0;
      case ChannelID.Color1:
        return 1;
      case ChannelID.Color2:
        return 2;
      case ChannelID.Color3:
        return cmyk ? 3 : channelId + 1;
      case ChannelID.Transparency:
        return cmyk ? 4 : 3;
      default:
        return channelId + 1;
    }
  }
  function clamp(value, min, max) {
    return value < min ? min : value > max ? max : value;
  }
  function hasAlpha(data) {
    const size = data.width * data.height * 4;
    for (let i = 3; i < size; i += 4) {
      if (data.data[i] !== 255) {
        return true;
      }
    }
    return false;
  }
  function resetImageData({ data }) {
    const alpha = data instanceof Float32Array ? 1 : data instanceof Uint16Array ? 65535 : 255;
    for (let p = 0, size = data.length | 0; p < size; p = p + 4 | 0) {
      data[p + 0] = 0;
      data[p + 1] = 0;
      data[p + 2] = 0;
      data[p + 3] = alpha;
    }
  }
  function imageDataToCanvas(pixelData) {
    const canvas = createCanvas(pixelData.width, pixelData.height);
    let imageData;
    if (pixelData.data instanceof Uint8ClampedArray) {
      imageData = pixelData;
    } else {
      imageData = createImageData(pixelData.width, pixelData.height);
      const src = pixelData.data;
      const dst = imageData.data;
      if (src instanceof Float32Array) {
        for (let i = 0, size = src.length; i < size; i += 4) {
          dst[i + 0] = Math.round(Math.pow(src[i + 0], 1 / 2.2) * 255);
          dst[i + 1] = Math.round(Math.pow(src[i + 1], 1 / 2.2) * 255);
          dst[i + 2] = Math.round(Math.pow(src[i + 2], 1 / 2.2) * 255);
          dst[i + 3] = Math.round(src[i + 3] * 255);
        }
      } else {
        const shift = src instanceof Uint16Array ? 8 : 0;
        for (let i = 0, size = src.length; i < size; i++) {
          dst[i] = src[i] >>> shift;
        }
      }
    }
    canvas.getContext("2d").putImageData(imageData, 0, 0);
    return canvas;
  }
  function decodeBitmap(input, output, width, height) {
    if (!(input instanceof Uint8Array || input instanceof Uint8ClampedArray))
      throw new Error("Invalid bit depth");
    for (let y = 0, p = 0, o = 0; y < height; y++) {
      for (let x = 0; x < width; ) {
        let b = input[o++];
        for (let i = 0; i < 8 && x < width; i++, x++, p += 4) {
          const v = b & 128 ? 0 : 255;
          b = b << 1;
          output[p + 0] = v;
          output[p + 1] = v;
          output[p + 2] = v;
          output[p + 3] = 255;
        }
      }
    }
  }
  function writeDataRaw(data, offset, width, height) {
    if (!width || !height) return void 0;
    const array = new Uint8Array(width * height);
    for (let i = 0; i < array.length; i++) {
      array[i] = data.data[i * 4 + offset];
    }
    return array;
  }
  function writeDataRLE(buffer, { data, width, height }, offsets, large) {
    if (!width || !height) return void 0;
    const stride = 4 * width | 0;
    let ol = 0;
    let o = offsets.length * (large ? 4 : 2) * height | 0;
    for (const offset of offsets) {
      for (let y = 0, p = offset | 0; y < height; y++) {
        const strideStart = y * stride | 0;
        const strideEnd = strideStart + stride | 0;
        const lastIndex = strideEnd + offset - 4 | 0;
        const lastIndex2 = lastIndex - 4 | 0;
        const startOffset = o;
        for (p = strideStart + offset | 0; p < strideEnd; p = p + 4 | 0) {
          if (p < lastIndex2) {
            let value1 = data[p];
            p = p + 4 | 0;
            let value2 = data[p];
            p = p + 4 | 0;
            let value3 = data[p];
            if (value1 === value2 && value1 === value3) {
              let count = 3;
              while (count < 128 && p < lastIndex && data[p + 4 | 0] === value1) {
                count = count + 1 | 0;
                p = p + 4 | 0;
              }
              buffer[o++] = 1 - count;
              buffer[o++] = value1;
            } else {
              const countIndex = o;
              let writeLast = true;
              let count = 1;
              buffer[o++] = 0;
              buffer[o++] = value1;
              while (p < lastIndex && count < 128) {
                p = p + 4 | 0;
                value1 = value2;
                value2 = value3;
                value3 = data[p];
                if (value1 === value2 && value1 === value3) {
                  p = p - 12 | 0;
                  writeLast = false;
                  break;
                } else {
                  count++;
                  buffer[o++] = value1;
                }
              }
              if (writeLast) {
                if (count < 127) {
                  buffer[o++] = value2;
                  buffer[o++] = value3;
                  count += 2;
                } else if (count < 128) {
                  buffer[o++] = value2;
                  count++;
                  p = p - 4 | 0;
                } else {
                  p = p - 8 | 0;
                }
              }
              buffer[countIndex] = count - 1;
            }
          } else if (p === lastIndex) {
            buffer[o++] = 0;
            buffer[o++] = data[p];
          } else {
            buffer[o++] = 1;
            buffer[o++] = data[p];
            p = p + 4 | 0;
            buffer[o++] = data[p];
          }
        }
        const length = o - startOffset;
        if (large) {
          buffer[ol++] = length >> 24 & 255;
          buffer[ol++] = length >> 16 & 255;
        }
        buffer[ol++] = length >> 8 & 255;
        buffer[ol++] = length & 255;
      }
    }
    return buffer.slice(0, o);
  }
  function writeDataZipWithoutPrediction({ data, width, height }, offsets) {
    const size = width * height;
    const channel = new Uint8Array(size);
    const buffers = [];
    let totalLength = 0;
    for (const offset of offsets) {
      for (let i = 0, o = offset; i < size; i++, o += 4) {
        channel[i] = data[o];
      }
      const buffer = (0, import_pako.deflate)(channel);
      buffers.push(buffer);
      totalLength += buffer.byteLength;
    }
    if (buffers.length > 0) {
      const buffer = new Uint8Array(totalLength);
      let offset = 0;
      for (const b of buffers) {
        buffer.set(b, offset);
        offset += b.byteLength;
      }
      return buffer;
    } else {
      return buffers[0];
    }
  }
  function initializeCanvas2(createCanvasMethod, createCanvasFromDataMethod, createImageDataMethod) {
    createCanvas = createCanvasMethod;
    createCanvasFromData = createCanvasFromDataMethod || createCanvasFromData;
    createImageData = createImageDataMethod || createImageData;
  }
  var import_base64_js, import_pako, MOCK_HANDLERS, RAW_IMAGE_DATA, fromBlendMode, toBlendMode, layerColors, largeAdditionalInfoKeys, ColorSpace, LayerMaskFlags, MaskParams, ChannelID, Compression, createCanvas, createCanvasFromData, tempCanvas, createImageData;
  var init_helpers = __esm({
    "helpers.js"() {
      import_base64_js = __toESM(require_base64_js());
      import_pako = __require("pako");
      MOCK_HANDLERS = false;
      RAW_IMAGE_DATA = false;
      fromBlendMode = {};
      toBlendMode = {
        pass: "pass through",
        norm: "normal",
        diss: "dissolve",
        dark: "darken",
        "mul ": "multiply",
        idiv: "color burn",
        lbrn: "linear burn",
        dkCl: "darker color",
        lite: "lighten",
        scrn: "screen",
        "div ": "color dodge",
        lddg: "linear dodge",
        lgCl: "lighter color",
        over: "overlay",
        sLit: "soft light",
        hLit: "hard light",
        vLit: "vivid light",
        lLit: "linear light",
        pLit: "pin light",
        hMix: "hard mix",
        diff: "difference",
        smud: "exclusion",
        fsub: "subtract",
        fdiv: "divide",
        "hue ": "hue",
        "sat ": "saturation",
        colr: "color",
        "lum ": "luminosity"
      };
      Object.keys(toBlendMode).forEach((key) => fromBlendMode[toBlendMode[key]] = key);
      layerColors = [
        "none",
        "red",
        "orange",
        "yellow",
        "green",
        "blue",
        "violet",
        "gray"
      ];
      largeAdditionalInfoKeys = [
        // from documentation
        "LMsk",
        "Lr16",
        "Lr32",
        "Layr",
        "Mt16",
        "Mt32",
        "Mtrn",
        "Alph",
        "FMsk",
        "lnk2",
        "FEid",
        "FXid",
        "PxSD",
        // from guessing
        "cinf"
      ];
      (function(ColorSpace2) {
        ColorSpace2[ColorSpace2["RGB"] = 0] = "RGB";
        ColorSpace2[ColorSpace2["HSB"] = 1] = "HSB";
        ColorSpace2[ColorSpace2["CMYK"] = 2] = "CMYK";
        ColorSpace2[ColorSpace2["Lab"] = 7] = "Lab";
        ColorSpace2[ColorSpace2["Grayscale"] = 8] = "Grayscale";
      })(ColorSpace || (ColorSpace = {}));
      (function(LayerMaskFlags2) {
        LayerMaskFlags2[LayerMaskFlags2["PositionRelativeToLayer"] = 1] = "PositionRelativeToLayer";
        LayerMaskFlags2[LayerMaskFlags2["LayerMaskDisabled"] = 2] = "LayerMaskDisabled";
        LayerMaskFlags2[LayerMaskFlags2["InvertLayerMaskWhenBlending"] = 4] = "InvertLayerMaskWhenBlending";
        LayerMaskFlags2[LayerMaskFlags2["LayerMaskFromRenderingOtherData"] = 8] = "LayerMaskFromRenderingOtherData";
        LayerMaskFlags2[LayerMaskFlags2["MaskHasParametersAppliedToIt"] = 16] = "MaskHasParametersAppliedToIt";
      })(LayerMaskFlags || (LayerMaskFlags = {}));
      (function(MaskParams2) {
        MaskParams2[MaskParams2["UserMaskDensity"] = 1] = "UserMaskDensity";
        MaskParams2[MaskParams2["UserMaskFeather"] = 2] = "UserMaskFeather";
        MaskParams2[MaskParams2["VectorMaskDensity"] = 4] = "VectorMaskDensity";
        MaskParams2[MaskParams2["VectorMaskFeather"] = 8] = "VectorMaskFeather";
      })(MaskParams || (MaskParams = {}));
      (function(ChannelID2) {
        ChannelID2[ChannelID2["Color0"] = 0] = "Color0";
        ChannelID2[ChannelID2["Color1"] = 1] = "Color1";
        ChannelID2[ChannelID2["Color2"] = 2] = "Color2";
        ChannelID2[ChannelID2["Color3"] = 3] = "Color3";
        ChannelID2[ChannelID2["Transparency"] = -1] = "Transparency";
        ChannelID2[ChannelID2["UserMask"] = -2] = "UserMask";
        ChannelID2[ChannelID2["RealUserMask"] = -3] = "RealUserMask";
      })(ChannelID || (ChannelID = {}));
      (function(Compression2) {
        Compression2[Compression2["RawData"] = 0] = "RawData";
        Compression2[Compression2["RleCompressed"] = 1] = "RleCompressed";
        Compression2[Compression2["ZipWithoutPrediction"] = 2] = "ZipWithoutPrediction";
        Compression2[Compression2["ZipWithPrediction"] = 3] = "ZipWithPrediction";
      })(Compression || (Compression = {}));
      createCanvas = () => {
        throw new Error(
          "Canvas not initialized, use initializeCanvas method to set up createCanvas method"
        );
      };
      createCanvasFromData = () => {
        throw new Error(
          "Canvas not initialized, use initializeCanvas method to set up createCanvasFromData method"
        );
      };
      tempCanvas = void 0;
      createImageData = (width, height) => {
        if (!tempCanvas) tempCanvas = createCanvas(1, 1);
        return tempCanvas.getContext("2d").createImageData(width, height);
      };
      if (typeof document !== "undefined") {
        createCanvas = (width, height) => {
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          return canvas;
        };
        createCanvasFromData = (data) => {
          const image = new Image();
          image.src = "data:image/jpeg;base64," + (0, import_base64_js.fromByteArray)(data);
          const canvas = document.createElement("canvas");
          canvas.width = image.width;
          canvas.height = image.height;
          canvas.getContext("2d").drawImage(image, 0, 0);
          return canvas;
        };
      }
    }
  });

  // psdWriter.js
  var psdWriter_exports = {};
  __export(psdWriter_exports, {
    createWriter: () => createWriter,
    getWriterBuffer: () => getWriterBuffer,
    getWriterBufferNoCopy: () => getWriterBufferNoCopy,
    writeBytes: () => writeBytes,
    writeColor: () => writeColor,
    writeFixedPoint32: () => writeFixedPoint32,
    writeFixedPointPath32: () => writeFixedPointPath32,
    writeFloat32: () => writeFloat32,
    writeFloat64: () => writeFloat64,
    writeInt16: () => writeInt16,
    writeInt32: () => writeInt32,
    writeInt32LE: () => writeInt32LE,
    writePascalString: () => writePascalString,
    writePsd: () => writePsd,
    writeSection: () => writeSection,
    writeSignature: () => writeSignature,
    writeUint16: () => writeUint16,
    writeUint16LE: () => writeUint16LE,
    writeUint32: () => writeUint32,
    writeUint8: () => writeUint8,
    writeUnicodeString: () => writeUnicodeString,
    writeUnicodeStringWithPadding: () => writeUnicodeStringWithPadding,
    writeUnicodeStringWithoutLength: () => writeUnicodeStringWithoutLength,
    writeUnicodeStringWithoutLengthLE: () => writeUnicodeStringWithoutLengthLE,
    writeZeros: () => writeZeros
  });
  function createWriter(size = 4096) {
    const buffer = new ArrayBuffer(size);
    const view = new DataView(buffer);
    const offset = 0;
    return { buffer, view, offset, tempBuffer: void 0 };
  }
  function getWriterBuffer(writer) {
    return writer.buffer.slice(0, writer.offset);
  }
  function getWriterBufferNoCopy(writer) {
    return new Uint8Array(writer.buffer, 0, writer.offset);
  }
  function writeUint8(writer, value) {
    const offset = addSize(writer, 1);
    writer.view.setUint8(offset, value);
  }
  function writeInt16(writer, value) {
    const offset = addSize(writer, 2);
    writer.view.setInt16(offset, value, false);
  }
  function writeUint16(writer, value) {
    const offset = addSize(writer, 2);
    writer.view.setUint16(offset, value, false);
  }
  function writeUint16LE(writer, value) {
    const offset = addSize(writer, 2);
    writer.view.setUint16(offset, value, true);
  }
  function writeInt32(writer, value) {
    const offset = addSize(writer, 4);
    writer.view.setInt32(offset, value, false);
  }
  function writeInt32LE(writer, value) {
    const offset = addSize(writer, 4);
    writer.view.setInt32(offset, value, true);
  }
  function writeUint32(writer, value) {
    const offset = addSize(writer, 4);
    writer.view.setUint32(offset, value, false);
  }
  function writeFloat32(writer, value) {
    const offset = addSize(writer, 4);
    writer.view.setFloat32(offset, value, false);
  }
  function writeFloat64(writer, value) {
    const offset = addSize(writer, 8);
    writer.view.setFloat64(offset, value, false);
  }
  function writeFixedPoint32(writer, value) {
    writeInt32(writer, value * (1 << 16));
  }
  function writeFixedPointPath32(writer, value) {
    writeInt32(writer, value * (1 << 24));
  }
  function writeBytes(writer, buffer) {
    if (buffer) {
      ensureSize(writer, writer.offset + buffer.length);
      const bytes = new Uint8Array(writer.buffer);
      bytes.set(buffer, writer.offset);
      writer.offset += buffer.length;
    }
  }
  function writeZeros(writer, count) {
    for (let i = 0; i < count; i++) {
      writeUint8(writer, 0);
    }
  }
  function writeSignature(writer, signature) {
    if (signature.length !== 4)
      throw new Error(`Invalid signature: '${signature}'`);
    for (let i = 0; i < 4; i++) {
      writeUint8(writer, signature.charCodeAt(i));
    }
  }
  function writePascalString(writer, text, padTo) {
    let length = text.length;
    if (length > 255) throw new Error(`String too long`);
    writeUint8(writer, length);
    for (let i = 0; i < length; i++) {
      const code = text.charCodeAt(i);
      writeUint8(writer, code < 128 ? code : "?".charCodeAt(0));
    }
    while (++length % padTo) {
      writeUint8(writer, 0);
    }
  }
  function writeUnicodeStringWithoutLength(writer, text) {
    for (let i = 0; i < text.length; i++) {
      writeUint16(writer, text.charCodeAt(i));
    }
  }
  function writeUnicodeStringWithoutLengthLE(writer, text) {
    for (let i = 0; i < text.length; i++) {
      writeUint16LE(writer, text.charCodeAt(i));
    }
  }
  function writeUnicodeString(writer, text) {
    writeUint32(writer, text.length);
    writeUnicodeStringWithoutLength(writer, text);
  }
  function writeUnicodeStringWithPadding(writer, text) {
    writeUint32(writer, text.length + 1);
    for (let i = 0; i < text.length; i++) {
      writeUint16(writer, text.charCodeAt(i));
    }
    writeUint16(writer, 0);
  }
  function getLargestLayerSize(layers = []) {
    let max = 0;
    for (const layer of layers) {
      if (layer.canvas || layer.imageData) {
        const { width, height } = getLayerDimentions(layer);
        max = Math.max(max, 2 * height + 2 * width * height);
      }
      if (layer.children) {
        max = Math.max(max, getLargestLayerSize(layer.children));
      }
    }
    return max;
  }
  function writeSection(writer, round, func, writeTotalLength = false, large = false) {
    if (large) writeUint32(writer, 0);
    const offset = writer.offset;
    writeUint32(writer, 0);
    func();
    let length = writer.offset - offset - 4;
    let len = length;
    while (len % round !== 0) {
      writeUint8(writer, 0);
      len++;
    }
    if (writeTotalLength) {
      length = len;
    }
    writer.view.setUint32(offset, length, false);
  }
  function verifyBitCount(target) {
    target.children?.forEach(verifyBitCount);
    const data = target.imageData;
    if (data && (data.data instanceof Uint32Array || data.data instanceof Uint16Array)) {
      throw new Error("imageData has incorrect bitDepth");
    }
    if ("mask" in target && target.mask) {
      const data2 = target.mask.imageData;
      if (data2 && (data2.data instanceof Uint32Array || data2.data instanceof Uint16Array)) {
        throw new Error("mask imageData has incorrect bitDepth");
      }
    }
  }
  function writePsd(writer, psd, options = {}) {
    if (!(+psd.width > 0 && +psd.height > 0))
      throw new Error("Invalid document size");
    if ((psd.width > 3e4 || psd.height > 3e4) && !options.psb)
      throw new Error(
        "Document size is too large (max is 30000x30000, use PSB format instead)"
      );
    const bitsPerChannel = psd.bitsPerChannel ?? 8;
    if (bitsPerChannel !== 8)
      throw new Error("bitsPerChannel other than 8 are not supported for writing");
    verifyBitCount(psd);
    const imageResources = { ...psd.imageResources };
    const opt = { ...options, layerIds: /* @__PURE__ */ new Set(), layerToId: /* @__PURE__ */ new Map() };
    if (opt.generateThumbnail) {
      imageResources.thumbnail = createThumbnail(psd);
    }
    let imageData = psd.imageData;
    if (!imageData && psd.canvas) {
      imageData = psd.canvas.getContext("2d").getImageData(0, 0, psd.canvas.width, psd.canvas.height);
    }
    if (imageData && (psd.width !== imageData.width || psd.height !== imageData.height))
      throw new Error("Document canvas must have the same size as document");
    const globalAlpha = !!imageData && hasAlpha(imageData);
    const maxBufferSize = Math.max(
      getLargestLayerSize(psd.children),
      4 * 2 * psd.width * psd.height + 2 * psd.height
    );
    writer.tempBuffer = new Uint8Array(maxBufferSize);
    writeSignature(writer, "8BPS");
    writeUint16(writer, options.psb ? 2 : 1);
    writeZeros(writer, 6);
    writeUint16(writer, globalAlpha ? 4 : 3);
    writeUint32(writer, psd.height);
    writeUint32(writer, psd.width);
    writeUint16(writer, bitsPerChannel);
    writeUint16(writer, import_psd.ColorMode.RGB);
    writeSection(writer, 1, () => {
      if (psd.palette) {
        for (let i = 0; i < 256; i++) writeUint8(writer, psd.palette[i]?.r || 0);
        for (let i = 0; i < 256; i++) writeUint8(writer, psd.palette[i]?.g || 0);
        for (let i = 0; i < 256; i++) writeUint8(writer, psd.palette[i]?.b || 0);
      }
    });
    const layers = [];
    addChildren(layers, psd.children);
    if (!layers.length) layers.push({});
    imageResources.layersGroup = layers.map((l) => l.linkGroup || 0);
    imageResources.layerGroupsEnabledId = layers.map(
      (l) => l.linkGroupEnabled == false ? 0 : 1
    );
    writeSection(writer, 1, () => {
      for (const handler of import_imageResources.resourceHandlers) {
        const has = handler.has(imageResources);
        const count = has === false ? 0 : has === true ? 1 : has;
        for (let i = 0; i < count; i++) {
          writeSignature(writer, "8BIM");
          writeUint16(writer, handler.key);
          writePascalString(writer, "", 2);
          writeSection(writer, 2, () => handler.write(writer, imageResources, i));
        }
      }
    });
    writeSection(
      writer,
      2,
      () => {
        writeLayerInfo(writer, layers, psd, globalAlpha, opt);
        writeGlobalLayerMaskInfo(writer, psd.globalLayerMaskInfo);
        writeAdditionalLayerInfo(writer, psd, psd, opt);
      },
      void 0,
      !!opt.psb
    );
    const channels = globalAlpha ? [0, 1, 2, 3] : [0, 1, 2];
    const width = imageData ? imageData.width : psd.width;
    const height = imageData ? imageData.height : psd.height;
    const data = { data: new Uint8Array(width * height * 4), width, height };
    writeUint16(writer, Compression.RleCompressed);
    if (RAW_IMAGE_DATA && psd.imageDataRaw) {
      console.log("writing raw image data");
      writeBytes(writer, psd.imageDataRaw);
    } else {
      if (imageData)
        data.data.set(
          new Uint8Array(
            imageData.data.buffer,
            imageData.data.byteOffset,
            imageData.data.byteLength
          )
        );
      if (globalAlpha) {
        const size = data.width * data.height * 4;
        const p = data.data;
        for (let i = 0; i < size; i += 4) {
          const pa = p[i + 3];
          if (pa != 0 && pa != 255) {
            const a = pa / 255;
            const ra = 255 * (1 - a);
            p[i + 0] = p[i + 0] * a + ra;
            p[i + 1] = p[i + 1] * a + ra;
            p[i + 2] = p[i + 2] * a + ra;
          }
        }
      }
      writeBytes(
        writer,
        writeDataRLE(writer.tempBuffer, data, channels, !!options.psb)
      );
    }
  }
  function writeLayerInfo(writer, layers, psd, globalAlpha, options) {
    writeSection(
      writer,
      4,
      () => {
        writeInt16(writer, globalAlpha ? -layers.length : layers.length);
        const layersData = layers.map(
          (l, i) => getChannels(writer.tempBuffer, l, i === 0, options)
        );
        for (const layerData of layersData) {
          const { layer, top, left, bottom, right, channels } = layerData;
          writeInt32(writer, top);
          writeInt32(writer, left);
          writeInt32(writer, bottom);
          writeInt32(writer, right);
          writeUint16(writer, channels.length);
          for (const c of channels) {
            writeInt16(writer, c.channelId);
            if (options.psb) writeUint32(writer, 0);
            writeUint32(writer, c.length);
          }
          writeSignature(writer, "8BIM");
          writeSignature(writer, fromBlendMode[layer.blendMode] || "norm");
          writeUint8(writer, Math.round(clamp(layer.opacity ?? 1, 0, 1) * 255));
          writeUint8(writer, layer.clipping ? 1 : 0);
          let flags = 8;
          if (layer.transparencyProtected) flags |= 1;
          if (layer.hidden) flags |= 2;
          if (layer.vectorMask || layer.sectionDivider && layer.sectionDivider.type !== import_psd.SectionDividerType.Other || layer.adjustment) {
            flags |= 16;
          }
          if (layer.effectsOpen) flags |= 32;
          writeUint8(writer, flags);
          writeUint8(writer, 0);
          writeSection(writer, 1, () => {
            writeLayerMaskData(writer, layer, layerData);
            writeLayerBlendingRanges(writer, layer);
            writePascalString(writer, (layer.name || "").substring(0, 255), 4);
            writeAdditionalLayerInfo(writer, layer, psd, options);
          });
        }
        for (const layerData of layersData) {
          for (const channel of layerData.channels) {
            writeUint16(writer, channel.compression);
            if (channel.buffer) {
              writeBytes(writer, channel.buffer);
            }
          }
        }
      },
      true,
      options.psb
    );
  }
  function writeLayerMaskData(writer, { mask, realMask }, layerData) {
    writeSection(writer, 1, () => {
      if (!mask && !realMask) return;
      let params = 0, flags = 0, realFlags = 0;
      if (mask) {
        if (mask.userMaskDensity !== void 0)
          params |= MaskParams.UserMaskDensity;
        if (mask.userMaskFeather !== void 0)
          params |= MaskParams.UserMaskFeather;
        if (mask.vectorMaskDensity !== void 0)
          params |= MaskParams.VectorMaskDensity;
        if (mask.vectorMaskFeather !== void 0)
          params |= MaskParams.VectorMaskFeather;
        if (mask.disabled) flags |= LayerMaskFlags.LayerMaskDisabled;
        if (mask.positionRelativeToLayer)
          flags |= LayerMaskFlags.PositionRelativeToLayer;
        if (mask.fromVectorData)
          flags |= LayerMaskFlags.LayerMaskFromRenderingOtherData;
        if (params) flags |= LayerMaskFlags.MaskHasParametersAppliedToIt;
      }
      const m = layerData.mask || {};
      writeInt32(writer, m.top || 0);
      writeInt32(writer, m.left || 0);
      writeInt32(writer, m.bottom || 0);
      writeInt32(writer, m.right || 0);
      writeUint8(writer, mask && mask.defaultColor || 0);
      writeUint8(writer, flags);
      if (realMask) {
        if (realMask.disabled) realFlags |= LayerMaskFlags.LayerMaskDisabled;
        if (realMask.positionRelativeToLayer)
          realFlags |= LayerMaskFlags.PositionRelativeToLayer;
        if (realMask.fromVectorData)
          realFlags |= LayerMaskFlags.LayerMaskFromRenderingOtherData;
        const r = layerData.realMask || {};
        writeUint8(writer, realFlags);
        writeUint8(writer, realMask.defaultColor || 0);
        writeInt32(writer, r.top || 0);
        writeInt32(writer, r.left || 0);
        writeInt32(writer, r.bottom || 0);
        writeInt32(writer, r.right || 0);
      }
      if (params && mask) {
        writeUint8(writer, params);
        if (mask.userMaskDensity !== void 0)
          writeUint8(writer, Math.round(mask.userMaskDensity * 255));
        if (mask.userMaskFeather !== void 0)
          writeFloat64(writer, mask.userMaskFeather);
        if (mask.vectorMaskDensity !== void 0)
          writeUint8(writer, Math.round(mask.vectorMaskDensity * 255));
        if (mask.vectorMaskFeather !== void 0)
          writeFloat64(writer, mask.vectorMaskFeather);
      }
      writeZeros(writer, 2);
    });
  }
  function writerBlendingRange(writer, range) {
    writeUint8(writer, range[0]);
    writeUint8(writer, range[1]);
    writeUint8(writer, range[2]);
    writeUint8(writer, range[3]);
  }
  function writeLayerBlendingRanges(writer, layer) {
    writeSection(writer, 1, () => {
      const ranges = layer.blendingRanges;
      if (ranges) {
        writerBlendingRange(writer, ranges.compositeGrayBlendSource);
        writerBlendingRange(writer, ranges.compositeGraphBlendDestinationRange);
        for (const r of ranges.ranges) {
          writerBlendingRange(writer, r.sourceRange);
          writerBlendingRange(writer, r.destRange);
        }
      }
    });
  }
  function writeGlobalLayerMaskInfo(writer, info) {
    writeSection(writer, 1, () => {
      if (info) {
        writeUint16(writer, info.overlayColorSpace);
        writeUint16(writer, info.colorSpace1);
        writeUint16(writer, info.colorSpace2);
        writeUint16(writer, info.colorSpace3);
        writeUint16(writer, info.colorSpace4);
        writeUint16(writer, info.opacity * 255);
        writeUint8(writer, info.kind);
        writeZeros(writer, 3);
      }
    });
  }
  function writeAdditionalLayerInfo(writer, target, psd, options) {
    for (const handler of import_additionalInfo.infoHandlers) {
      let key = handler.key;
      if (key === "Txt2" && options.invalidateTextLayers) continue;
      if (key === "vmsk" && options.psb) key = "vsms";
      if (handler.has(target)) {
        const large = options.psb && largeAdditionalInfoKeys.indexOf(key) !== -1;
        const writeTotalLength = key !== "Txt2" && key !== "cinf" && key !== "extn" && key !== "CAI " && key !== "OCIO";
        const fourBytes = key === "Txt2" || key === "luni" || key === "vmsk" || key === "artb" || key === "artd" || key === "vogk" || key === "SoLd" || key === "lnk2" || key === "vscg" || key === "vsms" || key === "GdFl" || key === "lmfx" || key === "lrFX" || key === "cinf" || key === "PlLd" || key === "Anno" || key === "CAI " || key === "OCIO" || key === "GenI" || key === "FEid";
        writeSignature(writer, large ? "8B64" : "8BIM");
        writeSignature(writer, key);
        writeSection(
          writer,
          fourBytes ? 4 : 2,
          () => {
            handler.write(writer, target, psd, options);
          },
          writeTotalLength,
          large
        );
      }
    }
  }
  function addChildren(layers, children) {
    if (!children) return;
    for (const c of children) {
      if (c.children && c.canvas)
        throw new Error(
          `Invalid layer, cannot have both 'canvas' and 'children' properties`
        );
      if (c.children && c.imageData)
        throw new Error(
          `Invalid layer, cannot have both 'imageData' and 'children' properties`
        );
      if (c.children) {
        layers.push({
          name: "</Layer group>",
          sectionDivider: {
            type: import_psd.SectionDividerType.BoundingSectionDivider
          }
          // blendingRanges: children[0].blendingRanges,
          // nameSource: 'lset',
          // id: layerIds.shift(),
          // protected: {
          // 	transparency: false,
          // 	composite: false,
          // 	position: false,
          // },
          // layerColor: 'red',
          // timestamp: timestamps.shift(),
          // referencePoint: { x: 0, y: 0 },
        });
        addChildren(layers, c.children);
        layers.push({
          ...c,
          blendMode: c.blendMode === "pass through" ? "normal" : c.blendMode,
          sectionDivider: {
            type: c.opened === false ? import_psd.SectionDividerType.ClosedFolder : import_psd.SectionDividerType.OpenFolder,
            key: fromBlendMode[c.blendMode] || "pass",
            subType: 0
          }
        });
      } else {
        layers.push({ ...c });
      }
    }
  }
  function resizeBuffer(writer, size) {
    let newLength = writer.buffer.byteLength;
    do {
      newLength *= 2;
    } while (size > newLength);
    const newBuffer = new ArrayBuffer(newLength);
    const newBytes = new Uint8Array(newBuffer);
    const oldBytes = new Uint8Array(writer.buffer);
    newBytes.set(oldBytes);
    writer.buffer = newBuffer;
    writer.view = new DataView(writer.buffer);
  }
  function ensureSize(writer, size) {
    if (size > writer.buffer.byteLength) {
      resizeBuffer(writer, size);
    }
  }
  function addSize(writer, size) {
    const offset = writer.offset;
    ensureSize(writer, writer.offset += size);
    return offset;
  }
  function createThumbnail(psd) {
    const canvas = createCanvas(10, 10);
    let scale = 1;
    if (psd.width > psd.height) {
      canvas.width = 160;
      canvas.height = Math.floor(psd.height * (canvas.width / psd.width));
      scale = canvas.width / psd.width;
    } else {
      canvas.height = 160;
      canvas.width = Math.floor(psd.width * (canvas.height / psd.height));
      scale = canvas.height / psd.height;
    }
    const context = canvas.getContext("2d");
    context.scale(scale, scale);
    if (psd.imageData) {
      context.drawImage(imageDataToCanvas(psd.imageData), 0, 0);
    } else if (psd.canvas) {
      context.drawImage(psd.canvas, 0, 0);
    }
    return canvas;
  }
  function getMaskChannels(tempBuffer, layerData, layer, mask, options, realMask) {
    let top = mask.top | 0;
    let left = mask.left | 0;
    let right = mask.right | 0;
    let bottom = mask.bottom | 0;
    let { width, height } = getLayerDimentions(mask);
    let imageData = mask.imageData;
    if (!imageData && mask.canvas && width && height) {
      imageData = mask.canvas.getContext("2d").getImageData(0, 0, width, height);
    }
    if (width && height && imageData) {
      right = left + width;
      bottom = top + height;
      if (imageData.width !== width || imageData.height !== height) {
        throw new Error("Invalid imageData dimentions");
      }
      let buffer;
      let compression;
      if (RAW_IMAGE_DATA && layer[realMask ? "realMaskDataRaw" : "maskDataRaw"]) {
        buffer = layer[realMask ? "realMaskDataRaw" : "maskDataRaw"];
        compression = layer[realMask ? "realMaskDataRawCompression" : "maskDataRawCompression"];
      } else if (options.compress) {
        buffer = writeDataZipWithoutPrediction(imageData, [0]);
        compression = Compression.ZipWithoutPrediction;
      } else {
        buffer = writeDataRLE(tempBuffer, imageData, [0], !!options.psb);
        compression = Compression.RleCompressed;
      }
      layerData.channels.push({
        channelId: realMask ? ChannelID.RealUserMask : ChannelID.UserMask,
        compression,
        buffer,
        length: 2 + buffer.length
      });
    }
    layerData[realMask ? "realMask" : "mask"] = { top, left, right, bottom };
  }
  function getChannels(tempBuffer, layer, background, options) {
    const layerData = getLayerChannels(tempBuffer, layer, background, options);
    if (layer.mask)
      getMaskChannels(tempBuffer, layerData, layer, layer.mask, options, false);
    if (layer.realMask)
      getMaskChannels(tempBuffer, layerData, layer, layer.realMask, options, true);
    return layerData;
  }
  function getLayerDimentions({ canvas, imageData }) {
    return imageData || canvas || { width: 0, height: 0 };
  }
  function cropImageData(data, left, top, width, height) {
    if (data.data instanceof Uint32Array || data.data instanceof Uint16Array) {
      throw new Error("imageData has incorrect bit depth");
    }
    const croppedData = createImageData(width, height);
    const srcData = data.data;
    const dstData = croppedData.data;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let src = (x + left + (y + top) * data.width) * 4;
        let dst = (x + y * width) * 4;
        dstData[dst] = srcData[src];
        dstData[dst + 1] = srcData[src + 1];
        dstData[dst + 2] = srcData[src + 2];
        dstData[dst + 3] = srcData[src + 3];
      }
    }
    return croppedData;
  }
  function getLayerChannels(tempBuffer, layer, background, options) {
    let top = layer.top | 0;
    let left = layer.left | 0;
    let right = layer.right | 0;
    let bottom = layer.bottom | 0;
    let channels = [
      {
        channelId: ChannelID.Transparency,
        compression: Compression.RawData,
        buffer: void 0,
        length: 2
      },
      {
        channelId: ChannelID.Color0,
        compression: Compression.RawData,
        buffer: void 0,
        length: 2
      },
      {
        channelId: ChannelID.Color1,
        compression: Compression.RawData,
        buffer: void 0,
        length: 2
      },
      {
        channelId: ChannelID.Color2,
        compression: Compression.RawData,
        buffer: void 0,
        length: 2
      }
    ];
    let { width, height } = getLayerDimentions(layer);
    if (!(layer.canvas || layer.imageData) || !width || !height) {
      right = left;
      bottom = top;
      return { layer, top, left, right, bottom, channels };
    }
    right = left + width;
    bottom = top + height;
    let data = layer.imageData || layer.canvas.getContext("2d").getImageData(0, 0, width, height);
    if (options.trimImageData) {
      const trimmed = trimData(data);
      if (trimmed.left !== 0 || trimmed.top !== 0 || trimmed.right !== data.width || trimmed.bottom !== data.height) {
        left += trimmed.left;
        top += trimmed.top;
        right -= data.width - trimmed.right;
        bottom -= data.height - trimmed.bottom;
        width = right - left;
        height = bottom - top;
        if (!width || !height)
          return { layer, top, left, right, bottom, channels };
        data = cropImageData(data, trimmed.left, trimmed.top, width, height);
      }
    }
    const channelIds = [ChannelID.Color0, ChannelID.Color1, ChannelID.Color2];
    if (!background || options.noBackground || layer.mask || hasAlpha(data) || RAW_IMAGE_DATA && layer.imageDataRaw?.["-1"]) {
      channelIds.unshift(ChannelID.Transparency);
    }
    channels = channelIds.map((channelId) => {
      const offset = offsetForChannel(channelId, false);
      let buffer;
      let compression;
      if (RAW_IMAGE_DATA && layer.imageDataRaw) {
        buffer = layer.imageDataRaw[channelId];
        compression = layer.imageDataRawCompression[channelId];
      } else if (options.compress) {
        buffer = writeDataZipWithoutPrediction(data, [offset]);
        compression = Compression.ZipWithoutPrediction;
      } else {
        buffer = writeDataRLE(tempBuffer, data, [offset], !!options.psb);
        compression = Compression.RleCompressed;
      }
      return { channelId, compression, buffer, length: 2 + buffer.length };
    });
    return { layer, top, left, right, bottom, channels };
  }
  function isRowEmpty({ data, width }, y, left, right) {
    const start = (y * width + left) * 4 + 3 | 0;
    const end = start + (right - left) * 4 | 0;
    for (let i = start; i < end; i = i + 4 | 0) {
      if (data[i] !== 0) {
        return false;
      }
    }
    return true;
  }
  function isColEmpty({ data, width }, x, top, bottom) {
    const stride = width * 4 | 0;
    const start = top * stride + x * 4 + 3 | 0;
    for (let y = top, i = start; y < bottom; y++, i = i + stride | 0) {
      if (data[i] !== 0) {
        return false;
      }
    }
    return true;
  }
  function trimData(data) {
    let top = 0;
    let left = 0;
    let right = data.width;
    let bottom = data.height;
    while (top < bottom && isRowEmpty(data, top, left, right)) top++;
    while (bottom > top && isRowEmpty(data, bottom - 1, left, right)) bottom--;
    while (left < right && isColEmpty(data, left, top, bottom)) left++;
    while (right > left && isColEmpty(data, right - 1, top, bottom)) right--;
    return { top, left, right, bottom };
  }
  function writeColor(writer, color) {
    if (!color) {
      writeUint16(writer, ColorSpace.RGB);
      writeZeros(writer, 8);
    } else if ("r" in color) {
      writeUint16(writer, ColorSpace.RGB);
      writeUint16(writer, Math.round(color.r * 257));
      writeUint16(writer, Math.round(color.g * 257));
      writeUint16(writer, Math.round(color.b * 257));
      writeUint16(writer, 0);
    } else if ("fr" in color) {
      writeUint16(writer, ColorSpace.RGB);
      writeUint16(writer, Math.round(color.fr * 255 * 257));
      writeUint16(writer, Math.round(color.fg * 255 * 257));
      writeUint16(writer, Math.round(color.fb * 255 * 257));
      writeUint16(writer, 0);
    } else if ("l" in color) {
      writeUint16(writer, ColorSpace.Lab);
      writeInt16(writer, Math.round(color.l * 1e4));
      writeInt16(
        writer,
        Math.round(color.a < 0 ? color.a * 12800 : color.a * 12700)
      );
      writeInt16(
        writer,
        Math.round(color.b < 0 ? color.b * 12800 : color.b * 12700)
      );
      writeUint16(writer, 0);
    } else if ("h" in color) {
      writeUint16(writer, ColorSpace.HSB);
      writeUint16(writer, Math.round(color.h * 65535));
      writeUint16(writer, Math.round(color.s * 65535));
      writeUint16(writer, Math.round(color.b * 65535));
      writeUint16(writer, 0);
    } else if ("c" in color) {
      writeUint16(writer, ColorSpace.CMYK);
      writeUint16(writer, Math.round(color.c * 257));
      writeUint16(writer, Math.round(color.m * 257));
      writeUint16(writer, Math.round(color.y * 257));
      writeUint16(writer, Math.round(color.k * 257));
    } else {
      writeUint16(writer, ColorSpace.Grayscale);
      writeUint16(writer, Math.round(color.k * 1e4 / 255));
      writeZeros(writer, 6);
    }
  }
  var import_psd, import_additionalInfo, import_imageResources;
  var init_psdWriter = __esm({
    "psdWriter.js"() {
      import_psd = __require("./psd");
      init_helpers();
      import_additionalInfo = __require("./additionalInfo");
      import_imageResources = __require("./imageResources");
    }
  });

  // psdReader.js
  var psdReader_exports = {};
  __export(psdReader_exports, {
    checkSignature: () => checkSignature,
    createImageDataBitDepth: () => createImageDataBitDepth,
    createReader: () => createReader,
    peekUint8: () => peekUint8,
    readAdditionalLayerInfo: () => readAdditionalLayerInfo,
    readAsciiString: () => readAsciiString,
    readBytes: () => readBytes,
    readColor: () => readColor,
    readData: () => readData,
    readDataRLE: () => readDataRLE,
    readDataZip: () => readDataZip,
    readFixedPoint32: () => readFixedPoint32,
    readFixedPointPath32: () => readFixedPointPath32,
    readFloat32: () => readFloat32,
    readFloat64: () => readFloat64,
    readGlobalLayerMaskInfo: () => readGlobalLayerMaskInfo,
    readInt16: () => readInt16,
    readInt32: () => readInt32,
    readInt32LE: () => readInt32LE,
    readLayerInfo: () => readLayerInfo,
    readPascalString: () => readPascalString,
    readPattern: () => readPattern,
    readPsd: () => readPsd,
    readSection: () => readSection,
    readSignature: () => readSignature,
    readUint16: () => readUint16,
    readUint16LE: () => readUint16LE,
    readUint32: () => readUint32,
    readUint8: () => readUint8,
    readUnicodeString: () => readUnicodeString,
    readUnicodeStringWithLength: () => readUnicodeStringWithLength,
    readUnicodeStringWithLengthLE: () => readUnicodeStringWithLengthLE,
    skipBytes: () => skipBytes,
    supportedColorModes: () => supportedColorModes,
    validSignatureAt: () => validSignatureAt,
    warnOrThrow: () => warnOrThrow
  });
  function setupGrayscale(data) {
    const size = data.width * data.height * 4;
    for (let i = 0; i < size; i += 4) {
      data.data[i + 1] = data.data[i];
      data.data[i + 2] = data.data[i];
    }
  }
  function createReader(buffer, offset, length) {
    const view = new DataView(buffer, offset, length);
    return {
      view,
      offset: 0,
      strict: false,
      debug: false,
      large: false,
      globalAlpha: false,
      log: console.log
    };
  }
  function warnOrThrow(reader, message) {
    if (reader.strict) throw new Error(message);
    if (reader.debug) reader.log(message);
  }
  function readUint8(reader) {
    reader.offset += 1;
    return reader.view.getUint8(reader.offset - 1);
  }
  function peekUint8(reader) {
    return reader.view.getUint8(reader.offset);
  }
  function readInt16(reader) {
    reader.offset += 2;
    return reader.view.getInt16(reader.offset - 2, false);
  }
  function readUint16(reader) {
    reader.offset += 2;
    return reader.view.getUint16(reader.offset - 2, false);
  }
  function readUint16LE(reader) {
    reader.offset += 2;
    return reader.view.getUint16(reader.offset - 2, true);
  }
  function readInt32(reader) {
    reader.offset += 4;
    return reader.view.getInt32(reader.offset - 4, false);
  }
  function readInt32LE(reader) {
    reader.offset += 4;
    return reader.view.getInt32(reader.offset - 4, true);
  }
  function readUint32(reader) {
    reader.offset += 4;
    return reader.view.getUint32(reader.offset - 4, false);
  }
  function readFloat32(reader) {
    reader.offset += 4;
    return reader.view.getFloat32(reader.offset - 4, false);
  }
  function readFloat64(reader) {
    reader.offset += 8;
    return reader.view.getFloat64(reader.offset - 8, false);
  }
  function readFixedPoint32(reader) {
    return readInt32(reader) / (1 << 16);
  }
  function readFixedPointPath32(reader) {
    return readInt32(reader) / (1 << 24);
  }
  function readBytes(reader, length) {
    const start = reader.view.byteOffset + reader.offset;
    reader.offset += length;
    if (start + length > reader.view.buffer.byteLength) {
      warnOrThrow(reader, "Reading bytes exceeding buffer length");
      if (length > 100 * 1024 * 1024) throw new Error("Reading past end of file");
      const result = new Uint8Array(length);
      const len = Math.min(length, reader.view.byteLength - start);
      if (len > 0) result.set(new Uint8Array(reader.view.buffer, start, len));
      return result;
    } else {
      return new Uint8Array(reader.view.buffer, start, length);
    }
  }
  function readSignature(reader) {
    return readShortString(reader, 4);
  }
  function validSignatureAt(reader, offset) {
    const sig = String.fromCharCode(reader.view.getUint8(offset)) + String.fromCharCode(reader.view.getUint8(offset + 1)) + String.fromCharCode(reader.view.getUint8(offset + 2)) + String.fromCharCode(reader.view.getUint8(offset + 3));
    return sig == "8BIM" || sig == "8B64";
  }
  function readPascalString(reader, padTo) {
    let length = readUint8(reader);
    const text = length ? readShortString(reader, length) : "";
    while (++length % padTo) {
      reader.offset++;
    }
    return text;
  }
  function readUnicodeString(reader) {
    const length = readUint32(reader);
    return readUnicodeStringWithLength(reader, length);
  }
  function readUnicodeStringWithLength(reader, length) {
    let text = "";
    while (length--) {
      const value = readUint16(reader);
      if (value || length > 0) {
        text += String.fromCharCode(value);
      }
    }
    return text;
  }
  function readUnicodeStringWithLengthLE(reader, length) {
    let text = "";
    while (length--) {
      const value = readUint16LE(reader);
      if (value || length > 0) {
        text += String.fromCharCode(value);
      }
    }
    return text;
  }
  function readAsciiString(reader, length) {
    let text = "";
    while (length--) {
      text += String.fromCharCode(readUint8(reader));
    }
    return text;
  }
  function skipBytes(reader, count) {
    reader.offset += count;
  }
  function checkSignature(reader, a, b) {
    const offset = reader.offset;
    const signature = readSignature(reader);
    if (signature !== a && signature !== b) {
      throw new Error(
        `Invalid signature: '${signature}' at 0x${offset.toString(16)}`
      );
    }
  }
  function readShortString(reader, length) {
    const buffer = readBytes(reader, length);
    let result = "";
    for (let i = 0; i < buffer.length; i++) {
      result += String.fromCharCode(buffer[i]);
    }
    return result;
  }
  function isValidSignature(sig) {
    return sig === "8BIM" || sig === "MeSa" || sig === "AgHg" || sig === "PHUT" || sig === "DCSR";
  }
  function readPsd(reader, readOptions = {}) {
    checkSignature(reader, "8BPS");
    const version = readUint16(reader);
    if (version !== 1 && version !== 2)
      throw new Error(`Invalid PSD file version: ${version}`);
    skipBytes(reader, 6);
    const channels = readUint16(reader);
    const height = readUint32(reader);
    const width = readUint32(reader);
    const bitsPerChannel = readUint16(reader);
    const colorMode = readUint16(reader);
    const maxSize = version === 1 ? 3e4 : 3e5;
    if (width > maxSize || height > maxSize)
      throw new Error(`Invalid size: ${width}x${height}`);
    if (channels > 16) throw new Error(`Invalid channel count: ${channels}`);
    if (![1, 8, 16, 32].includes(bitsPerChannel))
      throw new Error(`Invalid bitsPerChannel: ${bitsPerChannel}`);
    if (supportedColorModes.indexOf(colorMode) === -1)
      throw new Error(
        `Color mode not supported: ${colorModes[colorMode] ?? colorMode}`
      );
    const psd = { width, height, channels, bitsPerChannel, colorMode };
    Object.assign(reader, readOptions);
    reader.large = version === 2;
    reader.globalAlpha = false;
    const fixOffsets = [0, 1, -1, 2, -2, 3, -3, 4, -4];
    readSection(reader, 1, (left) => {
      if (!left()) return;
      if (colorMode === import_psd2.ColorMode.Indexed) {
        if (left() != 768) throw new Error("Invalid color palette size");
        psd.palette = [];
        for (let i = 0; i < 256; i++)
          psd.palette.push({ r: readUint8(reader), g: 0, b: 0 });
        for (let i = 0; i < 256; i++) psd.palette[i].g = readUint8(reader);
        for (let i = 0; i < 256; i++) psd.palette[i].b = readUint8(reader);
      } else {
      }
      skipBytes(reader, left());
    });
    const imageResources = {};
    readSection(reader, 1, (left) => {
      while (left() > 0) {
        const sigOffset = reader.offset;
        let sig = "";
        for (const offset of fixOffsets) {
          try {
            reader.offset = sigOffset + offset;
            sig = readSignature(reader);
          } catch {
          }
          if (isValidSignature(sig)) break;
        }
        if (!isValidSignature(sig)) {
          throw new Error(
            `Invalid signature: '${sig}' at 0x${sigOffset.toString(16)}`
          );
        }
        const id = readUint16(reader);
        readPascalString(reader, 2);
        readSection(reader, 2, (left2) => {
          const handler = import_imageResources2.resourceHandlersMap[id];
          const skip = id === 1036 && !!reader.skipThumbnail;
          if (handler && !skip) {
            try {
              handler.read(reader, imageResources, left2);
            } catch (e) {
              if (reader.throwForMissingFeatures) throw e;
              skipBytes(reader, left2());
            }
          } else {
            skipBytes(reader, left2());
          }
        });
      }
    });
    const { layersGroup, layerGroupsEnabledId, ...rest } = imageResources;
    if (Object.keys(rest)) {
      psd.imageResources = rest;
    }
    readSection(
      reader,
      1,
      (left) => {
        readSection(
          reader,
          2,
          (left2) => {
            readLayerInfo(reader, psd, imageResources);
            skipBytes(reader, left2());
          },
          void 0,
          reader.large
        );
        if (left() > 0) {
          const globalLayerMaskInfo = readGlobalLayerMaskInfo(reader);
          if (globalLayerMaskInfo) psd.globalLayerMaskInfo = globalLayerMaskInfo;
        } else {
          skipBytes(reader, left());
        }
        while (left() > 0) {
          while (left() && peekUint8(reader) === 0) {
            skipBytes(reader, 1);
          }
          if (left() >= 12) {
            readAdditionalLayerInfo(reader, psd, psd, imageResources);
          } else {
            skipBytes(reader, left());
          }
        }
      },
      void 0,
      reader.large
    );
    const hasChildren = psd.children && psd.children.length;
    const skipComposite = reader.skipCompositeImageData && (reader.skipLayerImageData || hasChildren);
    if (!skipComposite) {
      readImageData(reader, psd);
    }
    return psd;
  }
  function readLayerInfo(reader, psd, imageResources) {
    const { layersGroup = [], layerGroupsEnabledId = [] } = imageResources;
    let layerCount = readInt16(reader);
    if (layerCount < 0) {
      reader.globalAlpha = true;
      layerCount = -layerCount;
    }
    const layers = [];
    const layerChannels = [];
    for (let i = 0; i < layerCount; i++) {
      const { layer, channels } = readLayerRecord(reader, psd, imageResources);
      if (layersGroup[i] !== void 0) layer.linkGroup = layersGroup[i];
      if (layerGroupsEnabledId[i] !== void 0)
        layer.linkGroupEnabled = !!layerGroupsEnabledId[i];
      layers.push(layer);
      layerChannels.push(channels);
    }
    if (!reader.skipLayerImageData) {
      for (let i = 0; i < layerCount; i++) {
        readLayerChannelImageData(reader, psd, layers[i], layerChannels[i]);
      }
    }
    if (!psd.children) psd.children = [];
    const stack = [psd];
    for (let i = layers.length - 1; i >= 0; i--) {
      const l = layers[i];
      const type = l.sectionDivider ? l.sectionDivider.type : import_psd2.SectionDividerType.Other;
      if (type === import_psd2.SectionDividerType.OpenFolder || type === import_psd2.SectionDividerType.ClosedFolder) {
        l.opened = type === import_psd2.SectionDividerType.OpenFolder;
        l.children = [];
        if (l.sectionDivider?.key) {
          l.blendMode = toBlendMode[l.sectionDivider.key] ?? l.blendMode;
        }
        stack[stack.length - 1].children.unshift(l);
        stack.push(l);
      } else if (type === import_psd2.SectionDividerType.BoundingSectionDivider) {
        stack.pop();
      } else {
        stack[stack.length - 1].children.unshift(l);
      }
    }
  }
  function readLayerRecord(reader, psd, imageResources) {
    const layer = {};
    layer.top = readInt32(reader);
    layer.left = readInt32(reader);
    layer.bottom = readInt32(reader);
    layer.right = readInt32(reader);
    const channelCount = readUint16(reader);
    const channels = [];
    for (let i = 0; i < channelCount; i++) {
      let id = readInt16(reader);
      let length = readUint32(reader);
      if (reader.large) {
        if (length !== 0)
          throw new Error("Sizes larger than 4GB are not supported");
        length = readUint32(reader);
      }
      channels.push({ id, length });
    }
    checkSignature(reader, "8BIM");
    const blendMode = readSignature(reader);
    if (!toBlendMode[blendMode])
      throw new Error(`Invalid blend mode: '${blendMode}'`);
    layer.blendMode = toBlendMode[blendMode];
    layer.opacity = readUint8(reader) / 255;
    layer.clipping = readUint8(reader) === 1;
    const flags = readUint8(reader);
    layer.transparencyProtected = (flags & 1) !== 0;
    layer.hidden = (flags & 2) !== 0;
    if (flags & 32) layer.effectsOpen = true;
    skipBytes(reader, 1);
    readSection(reader, 1, (left) => {
      readLayerMaskData(reader, layer);
      const blendingRanges = readLayerBlendingRanges(reader);
      if (blendingRanges) layer.blendingRanges = blendingRanges;
      layer.name = readPascalString(reader, 1);
      while (left() > 4 && !validSignatureAt(reader, reader.offset))
        reader.offset++;
      while (left() >= 12)
        readAdditionalLayerInfo(reader, layer, psd, imageResources);
      skipBytes(reader, left());
    });
    return { layer, channels };
  }
  function readLayerMaskData(reader, layer) {
    return readSection(reader, 1, (left) => {
      if (!left()) return void 0;
      const mask = {};
      layer.mask = mask;
      mask.top = readInt32(reader);
      mask.left = readInt32(reader);
      mask.bottom = readInt32(reader);
      mask.right = readInt32(reader);
      mask.defaultColor = readUint8(reader);
      const flags = readUint8(reader);
      mask.positionRelativeToLayer = (flags & LayerMaskFlags.PositionRelativeToLayer) !== 0;
      mask.disabled = (flags & LayerMaskFlags.LayerMaskDisabled) !== 0;
      mask.fromVectorData = (flags & LayerMaskFlags.LayerMaskFromRenderingOtherData) !== 0;
      if (left() >= 18) {
        const realMask = {};
        layer.realMask = realMask;
        const realFlags = readUint8(reader);
        realMask.positionRelativeToLayer = (realFlags & LayerMaskFlags.PositionRelativeToLayer) !== 0;
        realMask.disabled = (realFlags & LayerMaskFlags.LayerMaskDisabled) !== 0;
        realMask.fromVectorData = (realFlags & LayerMaskFlags.LayerMaskFromRenderingOtherData) !== 0;
        realMask.defaultColor = readUint8(reader);
        realMask.top = readInt32(reader);
        realMask.left = readInt32(reader);
        realMask.bottom = readInt32(reader);
        realMask.right = readInt32(reader);
      }
      if (flags & LayerMaskFlags.MaskHasParametersAppliedToIt) {
        const params = readUint8(reader);
        if (params & MaskParams.UserMaskDensity)
          mask.userMaskDensity = readUint8(reader) / 255;
        if (params & MaskParams.UserMaskFeather)
          mask.userMaskFeather = readFloat64(reader);
        if (params & MaskParams.VectorMaskDensity)
          mask.vectorMaskDensity = readUint8(reader) / 255;
        if (params & MaskParams.VectorMaskFeather)
          mask.vectorMaskFeather = readFloat64(reader);
      }
      skipBytes(reader, left());
    });
  }
  function readBlendingRange(reader) {
    return [
      readUint8(reader),
      readUint8(reader),
      readUint8(reader),
      readUint8(reader)
    ];
  }
  function readLayerBlendingRanges(reader) {
    return readSection(reader, 1, (left) => {
      const compositeGrayBlendSource = readBlendingRange(reader);
      const compositeGraphBlendDestinationRange = readBlendingRange(reader);
      const ranges = [];
      while (left() > 0) {
        const sourceRange = readBlendingRange(reader);
        const destRange = readBlendingRange(reader);
        ranges.push({ sourceRange, destRange });
      }
      return {
        compositeGrayBlendSource,
        compositeGraphBlendDestinationRange,
        ranges
      };
    });
  }
  function readLayerChannelImageData(reader, psd, layer, channels) {
    const layerWidth = (layer.right || 0) - (layer.left || 0);
    const layerHeight = (layer.bottom || 0) - (layer.top || 0);
    const cmyk = psd.colorMode === import_psd2.ColorMode.CMYK;
    let imageData;
    if (layerWidth && layerHeight) {
      if (cmyk) {
        if (psd.bitsPerChannel !== 8)
          throw new Error("bitsPerChannel Not supproted");
        imageData = {
          width: layerWidth,
          height: layerHeight,
          data: new Uint8ClampedArray(layerWidth * layerHeight * 5)
        };
        for (let p = 4; p < imageData.data.byteLength; p += 5)
          imageData.data[p] = 255;
      } else {
        imageData = createImageDataBitDepth(
          layerWidth,
          layerHeight,
          psd.bitsPerChannel ?? 8
        );
        resetImageData(imageData);
      }
    }
    if (RAW_IMAGE_DATA) {
      layer.imageDataRaw = [];
      layer.imageDataRawCompression = [];
    }
    for (const channel of channels) {
      if (channel.length === 0) continue;
      if (channel.length < 2) throw new Error("Invalid channel length");
      const start = reader.offset;
      let compression = readUint16(reader);
      if (compression > 3) {
        reader.offset -= 1;
        compression = readUint16(reader);
      }
      if (compression > 3) {
        reader.offset -= 3;
        compression = readUint16(reader);
      }
      if (compression > 3) throw new Error(`Invalid compression: ${compression}`);
      if (channel.id === ChannelID.UserMask || channel.id === ChannelID.RealUserMask) {
        const mask = channel.id === ChannelID.UserMask ? layer.mask : layer.realMask;
        if (!mask)
          throw new Error(
            `Missing layer ${channel.id === ChannelID.UserMask ? "mask" : "real mask"} data`
          );
        const maskWidth = (mask.right || 0) - (mask.left || 0);
        const maskHeight = (mask.bottom || 0) - (mask.top || 0);
        if (maskWidth < 0 || maskHeight < 0 || maskWidth > 3e4 || maskHeight > 3e4)
          throw new Error("Invalid mask size");
        if (maskWidth && maskHeight) {
          const maskData = createImageDataBitDepth(
            maskWidth,
            maskHeight,
            psd.bitsPerChannel ?? 8
          );
          resetImageData(maskData);
          const start2 = reader.offset;
          readData(
            reader,
            channel.length,
            maskData,
            compression,
            maskWidth,
            maskHeight,
            psd.bitsPerChannel ?? 8,
            0,
            reader.large,
            4
          );
          if (RAW_IMAGE_DATA) {
            if (channel.id === ChannelID.UserMask) {
              layer.maskDataRawCompression = compression;
              layer.maskDataRaw = new Uint8Array(
                reader.view.buffer,
                reader.view.byteOffset + start2,
                reader.offset - start2
              );
            } else {
              layer.realMaskDataRawCompression = compression;
              layer.realMaskDataRaw = new Uint8Array(
                reader.view.buffer,
                reader.view.byteOffset + start2,
                reader.offset - start2
              );
            }
          }
          setupGrayscale(maskData);
          if (reader.useImageData) {
            mask.imageData = maskData;
          } else {
            mask.canvas = imageDataToCanvas(maskData);
          }
        }
      } else {
        const offset = offsetForChannel(channel.id, cmyk);
        let targetData = imageData;
        if (offset < 0) {
          targetData = void 0;
          if (reader.throwForMissingFeatures) {
            throw new Error(`Channel not supported: ${channel.id}`);
          }
        }
        readData(
          reader,
          channel.length,
          targetData,
          compression,
          layerWidth,
          layerHeight,
          psd.bitsPerChannel ?? 8,
          offset,
          reader.large,
          cmyk ? 5 : 4
        );
        if (RAW_IMAGE_DATA) {
          layer.imageDataRawCompression[channel.id] = compression;
          layer.imageDataRaw[channel.id] = new Uint8Array(
            reader.view.buffer,
            reader.view.byteOffset + start + 2,
            channel.length - 2
          );
        }
        reader.offset = start + channel.length;
        if (targetData && psd.colorMode === import_psd2.ColorMode.Grayscale) {
          setupGrayscale(targetData);
        }
      }
    }
    if (imageData) {
      if (cmyk) {
        const cmykData = imageData;
        imageData = createImageData(cmykData.width, cmykData.height);
        cmykToRgb(cmykData, imageData, false);
      }
      if (reader.useImageData) {
        layer.imageData = imageData;
      } else {
        layer.canvas = imageDataToCanvas(imageData);
      }
    }
  }
  function readData(reader, length, data, compression, width, height, bitDepth, offset, large, step) {
    if (compression === Compression.RawData) {
      readDataRaw(reader, data, width, height, bitDepth, step, offset);
    } else if (compression === Compression.RleCompressed) {
      readDataRLE(reader, data, width, height, bitDepth, step, [offset], large);
    } else if (compression === Compression.ZipWithoutPrediction) {
      readDataZip(
        reader,
        length,
        data,
        width,
        height,
        bitDepth,
        step,
        offset,
        false
      );
    } else if (compression === Compression.ZipWithPrediction) {
      readDataZip(
        reader,
        length,
        data,
        width,
        height,
        bitDepth,
        step,
        offset,
        true
      );
    } else {
      throw new Error(`Invalid Compression type: ${compression}`);
    }
  }
  function readGlobalLayerMaskInfo(reader) {
    return readSection(reader, 1, (left) => {
      if (!left()) return void 0;
      const overlayColorSpace = readUint16(reader);
      const colorSpace1 = readUint16(reader);
      const colorSpace2 = readUint16(reader);
      const colorSpace3 = readUint16(reader);
      const colorSpace4 = readUint16(reader);
      const opacity = readUint16(reader) / 255;
      const kind = readUint8(reader);
      skipBytes(reader, left());
      return {
        overlayColorSpace,
        colorSpace1,
        colorSpace2,
        colorSpace3,
        colorSpace4,
        opacity,
        kind
      };
    });
  }
  function readAdditionalLayerInfo(reader, target, psd, imageResources) {
    const sig = readSignature(reader);
    if (sig !== "8BIM" && sig !== "8B64")
      throw new Error(
        `Invalid signature: '${sig}' at 0x${(reader.offset - 4).toString(16)}`
      );
    const key = readSignature(reader);
    const u64 = sig === "8B64" || reader.large && largeAdditionalInfoKeys.indexOf(key) !== -1;
    readSection(
      reader,
      2,
      (left) => {
        const handler = import_additionalInfo2.infoHandlersMap[key];
        if (handler) {
          try {
            handler.read(reader, target, left, psd, imageResources);
          } catch (e) {
            if (reader.throwForMissingFeatures) throw e;
          }
        } else {
          reader.logMissingFeatures && reader.log(`Unhandled additional info: ${key}`);
          skipBytes(reader, left());
        }
        if (left()) {
          reader.logMissingFeatures && reader.log(`Unread ${left()} bytes left for additional info: ${key}`);
          skipBytes(reader, left());
        }
      },
      false,
      u64
    );
  }
  function createImageDataBitDepth(width, height, bitDepth, channels = 4) {
    if (bitDepth === 1 || bitDepth === 8) {
      if (channels === 4) {
        return createImageData(width, height);
      } else {
        return {
          width,
          height,
          data: new Uint8ClampedArray(width * height * channels)
        };
      }
    } else if (bitDepth === 16) {
      return { width, height, data: new Uint16Array(width * height * channels) };
    } else if (bitDepth === 32) {
      return { width, height, data: new Float32Array(width * height * channels) };
    } else {
      throw new Error(`Invalid bitDepth (${bitDepth})`);
    }
  }
  function readImageData(reader, psd) {
    const compression = readUint16(reader);
    const bitsPerChannel = psd.bitsPerChannel ?? 8;
    if (supportedColorModes.indexOf(psd.colorMode) === -1)
      throw new Error(`Color mode not supported: ${psd.colorMode}`);
    if (compression !== Compression.RawData && compression !== Compression.RleCompressed)
      throw new Error(`Compression type not supported: ${compression}`);
    const imageData = createImageDataBitDepth(
      psd.width,
      psd.height,
      bitsPerChannel
    );
    resetImageData(imageData);
    switch (psd.colorMode) {
      case import_psd2.ColorMode.Bitmap: {
        if (bitsPerChannel !== 1)
          throw new Error("Invalid bitsPerChannel for bitmap color mode");
        let bytes;
        if (compression === Compression.RawData) {
          bytes = readBytes(reader, Math.ceil(psd.width / 8) * psd.height);
        } else if (compression === Compression.RleCompressed) {
          bytes = new Uint8Array(psd.width * psd.height);
          readDataRLE(
            reader,
            { data: bytes, width: psd.width, height: psd.height },
            psd.width,
            psd.height,
            8,
            1,
            [0],
            reader.large
          );
        } else {
          throw new Error(`Bitmap compression not supported: ${compression}`);
        }
        decodeBitmap(bytes, imageData.data, psd.width, psd.height);
        break;
      }
      case import_psd2.ColorMode.RGB:
      case import_psd2.ColorMode.Grayscale: {
        const channels = psd.colorMode === import_psd2.ColorMode.Grayscale ? [0] : [0, 1, 2];
        if (psd.channels && psd.channels > 3) {
          for (let i = 3; i < psd.channels; i++) {
            channels.push(i);
          }
        } else if (reader.globalAlpha) {
          channels.push(3);
        }
        if (compression === Compression.RawData) {
          for (let i = 0; i < channels.length; i++) {
            readDataRaw(
              reader,
              imageData,
              psd.width,
              psd.height,
              bitsPerChannel,
              4,
              channels[i]
            );
          }
        } else if (compression === Compression.RleCompressed) {
          const start = reader.offset;
          readDataRLE(
            reader,
            imageData,
            psd.width,
            psd.height,
            bitsPerChannel,
            4,
            channels,
            reader.large
          );
          if (RAW_IMAGE_DATA)
            psd.imageDataRaw = new Uint8Array(
              reader.view.buffer,
              reader.view.byteOffset + start,
              reader.offset - start
            );
        }
        if (psd.colorMode === import_psd2.ColorMode.Grayscale) {
          setupGrayscale(imageData);
        }
        break;
      }
      case import_psd2.ColorMode.Indexed: {
        if (bitsPerChannel !== 8) throw new Error("bitsPerChannel Not supproted");
        if (psd.channels !== 1) throw new Error("Invalid channel count");
        if (!psd.palette) throw new Error("Missing color palette");
        if (compression === Compression.RawData) {
          throw new Error(`Not implemented`);
        } else if (compression === Compression.RleCompressed) {
          const indexedImageData = {
            width: imageData.width,
            height: imageData.height,
            data: new Uint8Array(imageData.width * imageData.height)
          };
          readDataRLE(
            reader,
            indexedImageData,
            psd.width,
            psd.height,
            bitsPerChannel,
            1,
            [0],
            reader.large
          );
          indexedToRgb(indexedImageData, imageData, psd.palette);
        } else {
          throw new Error(`Not implemented`);
        }
        break;
      }
      case import_psd2.ColorMode.CMYK: {
        if (bitsPerChannel !== 8) throw new Error("bitsPerChannel Not supproted");
        if (psd.channels !== 4) throw new Error(`Invalid channel count`);
        const channels = [0, 1, 2, 3];
        if (reader.globalAlpha) channels.push(4);
        if (compression === Compression.RawData) {
          throw new Error(`Not implemented`);
        } else if (compression === Compression.RleCompressed) {
          const cmykImageData = {
            width: imageData.width,
            height: imageData.height,
            data: new Uint8Array(imageData.width * imageData.height * 5)
          };
          const start = reader.offset;
          readDataRLE(
            reader,
            cmykImageData,
            psd.width,
            psd.height,
            bitsPerChannel,
            5,
            channels,
            reader.large
          );
          cmykToRgb(cmykImageData, imageData, true);
          if (RAW_IMAGE_DATA)
            psd.imageDataRaw = new Uint8Array(
              reader.view.buffer,
              reader.view.byteOffset + start,
              reader.offset - start
            );
        } else {
          throw new Error(`Not implemented`);
        }
        break;
      }
      default:
        throw new Error(`Color mode not supported: ${psd.colorMode}`);
    }
    if (reader.globalAlpha) {
      if (psd.bitsPerChannel !== 8)
        throw new Error("bitsPerChannel Not supproted");
      const p = imageData.data;
      const size = imageData.width * imageData.height * 4;
      for (let i = 0; i < size; i += 4) {
        const pa = p[i + 3];
        if (pa != 0 && pa != 255) {
          const a = pa / 255;
          const ra = 1 / a;
          const invA = 255 * (1 - ra);
          p[i + 0] = p[i + 0] * ra + invA;
          p[i + 1] = p[i + 1] * ra + invA;
          p[i + 2] = p[i + 2] * ra + invA;
        }
      }
    }
    if (reader.useImageData) {
      psd.imageData = imageData;
    } else {
      psd.canvas = imageDataToCanvas(imageData);
    }
  }
  function cmykToRgb(cmyk, rgb, reverseAlpha) {
    const size = rgb.width * rgb.height * 4;
    const srcData = cmyk.data;
    const dstData = rgb.data;
    for (let src = 0, dst = 0; dst < size; src += 5, dst += 4) {
      const c = srcData[src];
      const m = srcData[src + 1];
      const y = srcData[src + 2];
      const k = srcData[src + 3];
      dstData[dst] = (c * k | 0) / 255 | 0;
      dstData[dst + 1] = (m * k | 0) / 255 | 0;
      dstData[dst + 2] = (y * k | 0) / 255 | 0;
      dstData[dst + 3] = reverseAlpha ? 255 - srcData[src + 4] : srcData[src + 4];
    }
  }
  function indexedToRgb(indexed, rgb, palette) {
    const size = indexed.width * indexed.height;
    const srcData = indexed.data;
    const dstData = rgb.data;
    for (let src = 0, dst = 0; src < size; src++, dst += 4) {
      const c = palette[srcData[src]];
      dstData[dst + 0] = c.r;
      dstData[dst + 1] = c.g;
      dstData[dst + 2] = c.b;
      dstData[dst + 3] = 255;
    }
  }
  function verifyCompatible(a, b) {
    if (a.byteLength / a.length !== b.byteLength / b.length) {
      throw new Error("Invalid array types");
    }
  }
  function bytesToArray(bytes, bitDepth) {
    if (bitDepth === 8) {
      return bytes;
    } else if (bitDepth === 16) {
      if (bytes.byteOffset % 2) {
        const result = new Uint16Array(bytes.byteLength / 2);
        new Uint8Array(result.buffer, result.byteOffset, result.byteLength).set(
          bytes
        );
        return result;
      } else {
        return new Uint16Array(
          bytes.buffer,
          bytes.byteOffset,
          bytes.byteLength / 2
        );
      }
    } else if (bitDepth === 32) {
      if (bytes.byteOffset % 4) {
        const result = new Float32Array(bytes.byteLength / 4);
        new Uint8Array(result.buffer, result.byteOffset, result.byteLength).set(
          bytes
        );
        return result;
      } else {
        return new Float32Array(
          bytes.buffer,
          bytes.byteOffset,
          bytes.byteLength / 4
        );
      }
    } else {
      throw new Error(`Invalid bitDepth (${bitDepth})`);
    }
  }
  function copyChannelToPixelData(pixelData, channel, offset, step) {
    verifyCompatible(pixelData.data, channel);
    const size = pixelData.width * pixelData.height;
    const data = pixelData.data;
    for (let i = 0, p = offset | 0; i < size; i++, p = p + step | 0) {
      data[p] = channel[i];
    }
  }
  function readDataRaw(reader, pixelData, width, height, bitDepth, step, offset) {
    const buffer = readBytes(reader, width * height * Math.floor(bitDepth / 8));
    if (bitDepth == 32) {
      for (let i = 0; i < buffer.byteLength; i += 4) {
        const a = buffer[i + 0];
        const b = buffer[i + 1];
        const c = buffer[i + 2];
        const d = buffer[i + 3];
        buffer[i + 0] = d;
        buffer[i + 1] = c;
        buffer[i + 2] = b;
        buffer[i + 3] = a;
      }
    }
    const array = bytesToArray(buffer, bitDepth);
    if (pixelData && offset < step) {
      copyChannelToPixelData(pixelData, array, offset, step);
    }
  }
  function decodePredicted(data, width, height, mod) {
    for (let y = 0; y < height; y++) {
      const offset = y * width;
      for (let x = 1, o = offset + 1; x < width; x++, o++) {
        data[o] = (data[o - 1] + data[o]) % mod;
      }
    }
  }
  function readDataZip(reader, length, pixelData, width, height, bitDepth, step, offset, prediction) {
    const compressed = readBytes(reader, length);
    const decompressed = (0, import_pako2.inflate)(compressed);
    if (pixelData && offset < step) {
      const array = bytesToArray(decompressed, bitDepth);
      if (bitDepth === 8) {
        if (prediction) decodePredicted(decompressed, width, height, 256);
        copyChannelToPixelData(pixelData, decompressed, offset, step);
      } else if (bitDepth === 16) {
        if (prediction) decodePredicted(array, width, height, 65536);
        copyChannelToPixelData(pixelData, array, offset, step);
      } else if (bitDepth === 32) {
        if (prediction) decodePredicted(decompressed, width * 4, height, 256);
        let di = offset;
        const dst = new Uint32Array(
          pixelData.data.buffer,
          pixelData.data.byteOffset,
          pixelData.data.length
        );
        for (let y = 0; y < height; y++) {
          let a = width * 4 * y;
          for (let x = 0; x < width; x++, a++, di += step) {
            const b = a + width;
            const c = b + width;
            const d = c + width;
            dst[di] = (decompressed[a] << 24 | decompressed[b] << 16 | decompressed[c] << 8 | decompressed[d]) >>> 0;
          }
        }
      } else {
        throw new Error("Invalid bitDepth");
      }
    }
  }
  function readDataRLE(reader, pixelData, width, height, bitDepth, step, offsets, large) {
    const data = pixelData && pixelData.data;
    let lengths;
    if (large) {
      lengths = new Uint32Array(offsets.length * height);
      for (let o = 0, li = 0; o < offsets.length; o++) {
        for (let y = 0; y < height; y++, li++) {
          lengths[li] = readUint32(reader);
        }
      }
    } else {
      lengths = new Uint16Array(offsets.length * height);
      for (let o = 0, li = 0; o < offsets.length; o++) {
        for (let y = 0; y < height; y++, li++) {
          lengths[li] = readUint16(reader);
        }
      }
    }
    if (bitDepth !== 1 && bitDepth !== 8)
      throw new Error(`Invalid bit depth (${bitDepth})`);
    const extraLimit = step - 1 | 0;
    for (let c = 0, li = 0; c < offsets.length; c++) {
      const offset = offsets[c] | 0;
      const extra = c > extraLimit || offset > extraLimit;
      if (!data || extra) {
        for (let y = 0; y < height; y++, li++) {
          skipBytes(reader, lengths[li]);
        }
      } else {
        for (let y = 0, p = offset | 0; y < height; y++, li++) {
          const length = lengths[li];
          const buffer = readBytes(reader, length);
          for (let i = 0, x = 0; i < length; i++) {
            let header = buffer[i];
            if (header > 128) {
              const value = buffer[++i];
              header = 256 - header | 0;
              for (let j = 0; j <= header && x < width; j = j + 1 | 0, x = x + 1 | 0) {
                data[p] = value;
                p = p + step | 0;
              }
            } else if (header < 128) {
              for (let j = 0; j <= header && x < width; j = j + 1 | 0, x = x + 1 | 0) {
                data[p] = buffer[++i];
                p = p + step | 0;
              }
            } else {
            }
          }
        }
      }
    }
  }
  function readSection(reader, round, func, skipEmpty = true, eightBytes = false) {
    let length = readUint32(reader);
    if (eightBytes) {
      if (length !== 0) throw new Error("Sizes larger than 4GB are not supported");
      length = readUint32(reader);
    }
    if (length <= 0 && skipEmpty) return void 0;
    let end = reader.offset + length;
    if (end > reader.view.byteLength) throw new Error("Section exceeds file size");
    const result = func(() => end - reader.offset);
    if (reader.offset !== end) {
      if (reader.offset > end) {
        warnOrThrow(reader, "Exceeded section limits");
      } else {
        warnOrThrow(reader, `Unread section data`);
      }
    }
    while (end % round) end++;
    reader.offset = end;
    return result;
  }
  function readColor(reader) {
    const colorSpace = readUint16(reader);
    switch (colorSpace) {
      case ColorSpace.RGB: {
        const r = readUint16(reader) / 257;
        const g = readUint16(reader) / 257;
        const b = readUint16(reader) / 257;
        skipBytes(reader, 2);
        return { r, g, b };
      }
      case ColorSpace.HSB: {
        const h = readUint16(reader) / 65535;
        const s = readUint16(reader) / 65535;
        const b = readUint16(reader) / 65535;
        skipBytes(reader, 2);
        return { h, s, b };
      }
      case ColorSpace.CMYK: {
        const c = readUint16(reader) / 257;
        const m = readUint16(reader) / 257;
        const y = readUint16(reader) / 257;
        const k = readUint16(reader) / 257;
        return { c, m, y, k };
      }
      case ColorSpace.Lab: {
        const l = readInt16(reader) / 1e4;
        const ta = readInt16(reader);
        const tb = readInt16(reader);
        const a = ta < 0 ? ta / 12800 : ta / 12700;
        const b = tb < 0 ? tb / 12800 : tb / 12700;
        skipBytes(reader, 2);
        return { l, a, b };
      }
      case ColorSpace.Grayscale: {
        const k = readUint16(reader) * 255 / 1e4;
        skipBytes(reader, 6);
        return { k };
      }
      default:
        throw new Error("Invalid color space");
    }
  }
  function readPattern(reader) {
    readUint32(reader);
    const version = readUint32(reader);
    if (version !== 1) throw new Error(`Invalid pattern version: ${version}`);
    const colorMode = readUint32(reader);
    const x = readInt16(reader);
    const y = readInt16(reader);
    if (colorMode !== import_psd2.ColorMode.RGB && colorMode !== import_psd2.ColorMode.Grayscale && colorMode !== import_psd2.ColorMode.Indexed) {
      throw new Error(`Unsupported pattern color mode: ${colorMode}`);
    }
    let name = readUnicodeString(reader);
    const id = readPascalString(reader, 1);
    const palette = [];
    if (colorMode === import_psd2.ColorMode.Indexed) {
      for (let i = 0; i < 256; i++) {
        palette.push({
          r: readUint8(reader),
          g: readUint8(reader),
          b: readUint8(reader)
        });
      }
      skipBytes(reader, 4);
    }
    const version2 = readUint32(reader);
    if (version2 !== 3)
      throw new Error(`Invalid pattern VMAL version: ${version2}`);
    readUint32(reader);
    const top = readUint32(reader);
    const left = readUint32(reader);
    const bottom = readUint32(reader);
    const right = readUint32(reader);
    const channelsCount = readUint32(reader);
    const width = right - left;
    const height = bottom - top;
    const data = new Uint8Array(width * height * 4);
    for (let i = 3; i < data.byteLength; i += 4) {
      data[i] = 255;
    }
    for (let i = 0, ch = 0; i < channelsCount + 2; i++) {
      const has = readUint32(reader);
      if (!has) continue;
      const length = readUint32(reader);
      const pixelDepth = readUint32(reader);
      const ctop = readUint32(reader);
      const cleft = readUint32(reader);
      const cbottom = readUint32(reader);
      const cright = readUint32(reader);
      const pixelDepth2 = readUint16(reader);
      const compressionMode = readUint8(reader);
      const dataLength = length - (4 + 16 + 2 + 1);
      const cdata = readBytes(reader, dataLength);
      if (pixelDepth !== 8 || pixelDepth2 !== 8) {
        throw new Error("16bit pixel depth not supported for patterns");
      }
      const w = cright - cleft;
      const h = cbottom - ctop;
      const ox = cleft - left;
      const oy = ctop - top;
      if (compressionMode === 0) {
        if (colorMode === import_psd2.ColorMode.RGB && ch < 3) {
          for (let y2 = 0; y2 < h; y2++) {
            for (let x2 = 0; x2 < w; x2++) {
              const src = x2 + y2 * w;
              const dst = (ox + x2 + (y2 + oy) * width) * 4;
              data[dst + ch] = cdata[src];
            }
          }
        }
        if (colorMode === import_psd2.ColorMode.Grayscale && ch < 1) {
          for (let y2 = 0; y2 < h; y2++) {
            for (let x2 = 0; x2 < w; x2++) {
              const src = x2 + y2 * w;
              const dst = (ox + x2 + (y2 + oy) * width) * 4;
              const value = cdata[src];
              data[dst + 0] = value;
              data[dst + 1] = value;
              data[dst + 2] = value;
            }
          }
        }
        if (colorMode === import_psd2.ColorMode.Indexed) {
          throw new Error("Indexed pattern color mode not implemented");
        }
      } else if (compressionMode === 1) {
        reader.log("Unsupported pattern compression");
        name += " (failed to decode)";
      } else {
        throw new Error("Invalid pattern compression mode");
      }
      ch++;
    }
    return {
      id,
      name,
      x,
      y,
      bounds: { x: left, y: top, w: width, h: height },
      data
    };
  }
  var import_pako2, import_psd2, import_additionalInfo2, import_imageResources2, supportedColorModes, colorModes;
  var init_psdReader = __esm({
    "psdReader.js"() {
      import_pako2 = __require("pako");
      import_psd2 = __require("./psd");
      init_helpers();
      import_additionalInfo2 = __require("./additionalInfo");
      import_imageResources2 = __require("./imageResources");
      supportedColorModes = [
        import_psd2.ColorMode.Bitmap,
        import_psd2.ColorMode.Grayscale,
        import_psd2.ColorMode.RGB,
        import_psd2.ColorMode.Indexed
      ];
      colorModes = [
        "bitmap",
        "grayscale",
        "indexed",
        "RGB",
        "CMYK",
        "multichannel",
        "duotone",
        "lab"
      ];
    }
  });

  // ag-psd.js
  var require_ag_psd = __commonJS({
    "ag-psd.js"(exports) {
      var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
        if (k2 === void 0) k2 = k;
        Object.defineProperty(o, k2, { enumerable: true, get: function() {
          return m[k];
        } });
      } : function(o, m, k, k2) {
        if (k2 === void 0) k2 = k;
        o[k2] = m[k];
      });
      var __exportStar = exports && exports.__exportStar || function(m, exports2) {
        for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
      };
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.writePsdBuffer = exports.writePsdUint8Array = exports.writePsd = exports.readPsd = exports.byteArrayToBase64 = exports.initializeCanvas = void 0;
      var psdWriter_1 = (init_psdWriter(), __toCommonJS(psdWriter_exports));
      var psdReader_1 = (init_psdReader(), __toCommonJS(psdReader_exports));
      var helpers_1 = (init_helpers(), __toCommonJS(helpers_exports));
      Object.defineProperty(exports, "initializeCanvas", { enumerable: true, get: function() {
        return helpers_1.initializeCanvas;
      } });
      __exportStar(__require("./psd"), exports);
      var base64_js_1 = require_base64_js();
      exports.byteArrayToBase64 = base64_js_1.fromByteArray;
      function readPsd2(buffer, options) {
        var reader = "buffer" in buffer ? psdReader_1.createReader(buffer.buffer, buffer.byteOffset, buffer.byteLength) : psdReader_1.createReader(buffer);
        return psdReader_1.readPsd(reader, options);
      }
      exports.readPsd = readPsd2;
      function writePsd2(psd, options) {
        var writer = psdWriter_1.createWriter();
        psdWriter_1.writePsd(writer, psd, options);
        return psdWriter_1.getWriterBuffer(writer);
      }
      exports.writePsd = writePsd2;
      function writePsdUint8Array(psd, options) {
        var writer = psdWriter_1.createWriter();
        psdWriter_1.writePsd(writer, psd, options);
        return psdWriter_1.getWriterBufferNoCopy(writer);
      }
      exports.writePsdUint8Array = writePsdUint8Array;
      function writePsdBuffer(psd, options) {
        if (typeof Buffer === "undefined") {
          throw new Error("Buffer not supported on this platform");
        }
        return Buffer.from(writePsdUint8Array(psd, options));
      }
      exports.writePsdBuffer = writePsdBuffer;
      if (typeof window !== "undefined") {
        window.AgPsd = {
          readPsd: readPsd2,
          writePsd: writePsd2,
          writePsdUint8Array,
          writePsdBuffer,
          initializeCanvas,
          byteArrayToBase64
        };
      }
    }
  });
  require_ag_psd();
})();
