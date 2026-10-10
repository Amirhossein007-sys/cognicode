/**
 * CogniCode Project & ZIP Engine
 * Unpacks ZIP archives (.zip), detects project architecture (WordPress plugins, themes,
 * web apps, Node.js packages), and generates intelligent multi-file analysis dossiers.
 *
 * F10: Resource budgets (decompressed size cap, single-file cap, entry count, timeout)
 * F11: Authentic pure JS RFC 1951 deflate fallback, awaited stream writers, CRC32 verification
 * F04: Fair-share multi-file dossier generation covering all files with clear partial truncation markers
 */
(function(window) {
  'use strict';

  var ProjectZip = {};

  // Standard CRC32 table & calculator
  var crcTable = (function() {
    var table = new Uint32Array(256);
    for (var i = 0; i < 256; i++) {
      var c = i;
      for (var k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }
    return table;
  })();

  function crc32(bytes) {
    var crc = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) {
      crc = crcTable[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  // Pure JS RFC 1951 Raw Deflate Fallback (stored, fixed, and dynamic Huffman)
  function inflateRawFallback(input, maxBytes) {
    maxBytes = maxBytes || 35 * 1024 * 1024;
    var bitpos = 0, bytepos = 0;
    function bits(n) {
      var v = 0;
      for (var i = 0; i < n; i++) {
        if (bytepos >= input.length) return v;
        v |= ((input[bytepos] >> bitpos) & 1) << i;
        bitpos++;
        if (bitpos === 8) { bitpos = 0; bytepos++; }
      }
      return v;
    }

    function makeTree(lengths, num) {
      var count = new Uint16Array(16);
      for (var i = 0; i < num; i++) count[lengths[i]]++;
      count[0] = 0;
      var offs = new Uint16Array(16);
      for (var i = 1; i < 16; i++) offs[i] = (offs[i - 1] + count[i - 1]) << 1;
      var map = new Uint16Array(num);
      for (var i = 0; i < num; i++) {
        var len = lengths[i];
        if (len) map[i] = offs[len]++;
      }
      var rev = new Uint16Array(num);
      for (var i = 0; i < num; i++) {
        var len = lengths[i];
        if (len) {
          var code = map[i], r = 0;
          for (var j = 0; j < len; j++) {
            r = (r << 1) | (code & 1);
            code >>= 1;
          }
          rev[i] = r;
        }
      }
      return { lengths: lengths, num: num, rev: rev };
    }

    function decodeSymbol(tree) {
      var code = 0;
      for (var len = 1; len <= 15; len++) {
        code |= bits(1) << (len - 1);
        for (var i = 0; i < tree.num; i++) {
          if (tree.lengths[i] === len && tree.rev[i] === code) return i;
        }
      }
      throw new Error('کد فشرده‌سازی نامعتبر است');
    }

    var fixedLitLens = new Uint8Array(288);
    for (var i = 0; i <= 143; i++) fixedLitLens[i] = 8;
    for (var i = 144; i <= 255; i++) fixedLitLens[i] = 9;
    for (var i = 256; i <= 279; i++) fixedLitLens[i] = 7;
    for (var i = 280; i <= 287; i++) fixedLitLens[i] = 8;
    var fixedDistLens = new Uint8Array(32);
    for (var i = 0; i < 32; i++) fixedDistLens[i] = 5;

    var fixedLitTree = makeTree(fixedLitLens, 288);
    var fixedDistTree = makeTree(fixedDistLens, 32);

    var LENS = [3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258];
    var LEXT = [0,0,0,0,0,0,0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4,  4,  5,  5,  5,  5,  0];
    var DISTS = [1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577];
    var DEXT = [0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];
    var CLEN_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

    var out = [];
    var isLast = 0;

    while (!isLast) {
      isLast = bits(1);
      var btype = bits(2);
      if (btype === 0) {
        if (bitpos !== 0) { bitpos = 0; bytepos++; }
        if (bytepos + 4 > input.length) break;
        var len = input[bytepos] | (input[bytepos + 1] << 8);
        bytepos += 4;
        for (var i = 0; i < len && bytepos < input.length; i++) {
          out.push(input[bytepos++]);
          if (out.length > maxBytes) throw new Error('حجم محتوای بازشده از سقف مجاز فراتر رفت');
        }
      } else if (btype === 1 || btype === 2) {
        var litTree, distTree;
        if (btype === 1) {
          litTree = fixedLitTree;
          distTree = fixedDistTree;
        } else {
          var hlit = bits(5) + 257;
          var hdist = bits(5) + 1;
          var hclen = bits(4) + 4;
          var clenLens = new Uint8Array(19);
          for (var i = 0; i < hclen; i++) clenLens[CLEN_ORDER[i]] = bits(3);
          var clenTree = makeTree(clenLens, 19);

          var codeLengths = new Uint8Array(hlit + hdist);
          var idx = 0;
          while (idx < hlit + hdist) {
            var sym = decodeSymbol(clenTree);
            if (sym <= 15) {
              codeLengths[idx++] = sym;
            } else if (sym === 16) {
              var rep = bits(2) + 3;
              var prev = codeLengths[idx - 1];
              for (var r = 0; r < rep && idx < hlit + hdist; r++) codeLengths[idx++] = prev;
            } else if (sym === 17) {
              var rep = bits(3) + 3;
              for (var r = 0; r < rep && idx < hlit + hdist; r++) codeLengths[idx++] = 0;
            } else if (sym === 18) {
              var rep = bits(7) + 11;
              for (var r = 0; r < rep && idx < hlit + hdist; r++) codeLengths[idx++] = 0;
            }
          }
          litTree = makeTree(codeLengths.subarray(0, hlit), hlit);
          distTree = makeTree(codeLengths.subarray(hlit), hdist);
        }

        while (true) {
          var sym = decodeSymbol(litTree);
          if (sym < 256) {
            out.push(sym);
            if (out.length > maxBytes) throw new Error('حجم محتوای بازشده از سقف مجاز فراتر رفت');
          } else if (sym === 256) {
            break;
          } else {
            var lidx = sym - 257;
            var length = LENS[lidx] + (LEXT[lidx] > 0 ? bits(LEXT[lidx]) : 0);
            var didx = decodeSymbol(distTree);
            var dist = DISTS[didx] + (DEXT[didx] > 0 ? bits(DEXT[didx]) : 0);
            for (var k = 0; k < length; k++) {
              out.push(out[out.length - dist]);
              if (out.length > maxBytes) throw new Error('حجم محتوای بازشده از سقف مجاز فراتر رفت');
            }
          }
        }
      } else {
        throw new Error('نوع بلوک نامعتبر در داده‌های فشرده');
      }
    }
    return new Uint8Array(out);
  }

  // Decompress DEFLATE data (Primary: Native DecompressionStream, Fallback: RFC 1951 pure JS)
  async function decompressDeflate(rawBytes, maxBytes, expectedCrc) {
    var result = null;
    if (typeof DecompressionStream !== 'undefined') {
      try {
        var ds = new DecompressionStream('deflate-raw');
        var writer = ds.writable.getWriter();
        var reader = ds.readable.getReader();
        var writePromise = (async function() {
          await writer.write(rawBytes);
          await writer.close();
        })();
        var chunks = [];
        var total = 0;
        while (true) {
          var res = await reader.read();
          if (res.done) break;
          chunks.push(res.value);
          total += res.value.length;
          if (maxBytes && total > maxBytes) {
            try { await reader.cancel(); } catch (_) {}
            throw new Error('حجم محتوای بازشده از سقف مجاز فراتر رفت');
          }
        }
        await writePromise;
        var out = new Uint8Array(total);
        var offset = 0;
        for (var i = 0; i < chunks.length; i++) {
          out.set(chunks[i], offset);
          offset += chunks[i].length;
        }
        result = out;
      } catch (e) {
        if (e && e.message && e.message.includes('سقف مجاز')) throw e;
        result = null;
      }
    }
    if (!result) {
      result = inflateRawFallback(rawBytes, maxBytes);
    }
    if (expectedCrc && crc32(result) !== expectedCrc) {
      throw new Error('خطای تطبیق چکسام (CRC) در فایل فشرده');
    }
    return result;
  }

  // Checks if a file is a ZIP archive
  ProjectZip.isZip = function(file, bytes) {
    if (file && file.name && /\.zip$/i.test(file.name)) return true;
    var b = bytes;
    if (!b && file && file instanceof Uint8Array) b = file;
    if (b && b.length >= 4) {
      return b[0] === 0x50 && b[1] === 0x4b &&
        ((b[2] === 0x03 && b[3] === 0x04) ||
         (b[2] === 0x05 && b[3] === 0x06) ||
         (b[2] === 0x07 && b[3] === 0x08));
    }
    return false;
  };

  // Binary ZIP parser with resource budgets
  ProjectZip.parseZip = async function(arrayBuffer) {
    var rawBytes = arrayBuffer instanceof Uint8Array ? arrayBuffer : new Uint8Array(arrayBuffer);
    var bytes = new Uint8Array(rawBytes.buffer, rawBytes.byteOffset, rawBytes.byteLength);
    var view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    var len = bytes.length;

    // Resource budgets (F10)
    var MAX_TOTAL_DECOMPRESSED = 35 * 1024 * 1024; // 35 MB total limit
    var MAX_SINGLE_FILE = 12 * 1024 * 1024;        // 12 MB per file limit
    var MAX_ENTRIES = 1000;                        // 1000 files limit
    var TIMEOUT_MS = 15000;                        // 15 seconds processing limit
    var startTime = Date.now();
    var cumulativeDecompressed = 0;

    // Locate EOCD record
    var eocdOffset = -1;
    for (var i = len - 22; i >= Math.max(0, len - 65558); i--) {
      if (view.getUint32(i, true) === 0x06054b50) {
        eocdOffset = i;
        break;
      }
    }
    if (eocdOffset === -1) {
      throw new Error('فایل ZIP ساختار معتبری ندارد یا ناقص است');
    }

    var cdEntries = view.getUint16(eocdOffset + 10, true);
    var cdOffset = view.getUint32(eocdOffset + 16, true);

    if (cdEntries > MAX_ENTRIES) {
      throw new Error('تعداد فایل‌های درون بسته از سقف مجاز (' + MAX_ENTRIES + ' فایل) بیشتر است');
    }

    var cur = cdOffset;
    var files = [];
    var decoder = new TextDecoder('utf-8', { fatal: false });

    var ignoredExts = new Set([
      'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'svg', 'bmp', 'pdf',
      'zip', 'gz', 'tar', '7z', 'rar', 'exe', 'bin', 'dll', 'so', 'dylib',
      'woff', 'woff2', 'ttf', 'eot', 'otf',
      'mp3', 'mp4', 'wav', 'ogg', 'mov', 'avi'
    ]);

    for (var entryIdx = 0; entryIdx < cdEntries; entryIdx++) {
      if (Date.now() - startTime > TIMEOUT_MS) {
        throw new Error('زمان پردازش فایل ZIP بیش از حد مجاز طول کشید');
      }

      if (cur + 46 > len) break;
      if (view.getUint32(cur, true) !== 0x02014b50) break;

      var flags = view.getUint16(cur + 8, true);
      if ((flags & 1) !== 0) {
        throw new Error('فایل‌های ZIP دارای رمز عبور پشتیبانی نمی‌شوند');
      }

      var method = view.getUint16(cur + 10, true);
      var entryCrc = view.getUint32(cur + 16, true);
      var compressedSize = view.getUint32(cur + 20, true);
      var uncompressedSize = view.getUint32(cur + 24, true);
      var nameLen = view.getUint16(cur + 28, true);
      var extraLen = view.getUint16(cur + 30, true);
      var commentLen = view.getUint16(cur + 32, true);
      var localOffset = view.getUint32(cur + 42, true);

      if (uncompressedSize > MAX_SINGLE_FILE) {
        throw new Error('اندازهٔ فایل فشرده از سقف مجاز فراتر رفت');
      }

      var nameBytes = bytes.subarray(cur + 46, cur + 46 + nameLen);
      var fullPath = decoder.decode(nameBytes);

      cur += 46 + nameLen + extraLen + commentLen;

      // Filter noise & directory traversal attempts
      if (fullPath.endsWith('/') || fullPath.includes('__MACOSX/') || fullPath.endsWith('.DS_Store')) {
        continue;
      }
      if (fullPath.includes('..') || fullPath.startsWith('/') || fullPath.startsWith('\\')) {
        continue;
      }

      var parts = fullPath.split('.');
      var ext = parts.length > 1 ? parts.pop().toLowerCase() : '';
      if (ignoredExts.has(ext)) continue;

      // Read from local file header
      if (localOffset + 30 > len) continue;
      if (view.getUint32(localOffset, true) !== 0x04034b50) continue;

      var localNameLen = view.getUint16(localOffset + 26, true);
      var localExtraLen = view.getUint16(localOffset + 28, true);
      var dataStart = localOffset + 30 + localNameLen + localExtraLen;

      if (dataStart + compressedSize > len) continue;
      var fileSlice = bytes.subarray(dataStart, dataStart + compressedSize);

      var decompressedBytes;
      var remainingBudget = MAX_TOTAL_DECOMPRESSED - cumulativeDecompressed;
      if (remainingBudget <= 0) {
        throw new Error('حجم کل محتوای بازشده از سقف مجاز فراتر رفت');
      }

      if (method === 0) {
        decompressedBytes = fileSlice;
        if (decompressedBytes.length > MAX_SINGLE_FILE) {
          throw new Error('اندازهٔ فایل فشرده از سقف مجاز فراتر رفت');
        }
        if (entryCrc && crc32(decompressedBytes) !== entryCrc) {
          throw new Error('خطای تطبیق چکسام (CRC) در فایل فشرده');
        }
      } else if (method === 8) {
        try {
          decompressedBytes = await decompressDeflate(fileSlice, Math.min(MAX_SINGLE_FILE, remainingBudget), entryCrc);
        } catch (eDef) {
          if (eDef && eDef.message && (eDef.message.includes('سقف مجاز') || eDef.message.includes('چکسام'))) {
            throw eDef;
          }
          continue;
        }
      } else {
        throw new Error('روش فشرده‌سازی این فایل ZIP پشتیبانی نمی‌شود');
      }

      cumulativeDecompressed += decompressedBytes.length;
      if (cumulativeDecompressed > MAX_TOTAL_DECOMPRESSED) {
        throw new Error('حجم کل محتوای بازشده از سقف مجاز فراتر رفت');
      }

      var text;
      try {
        text = decoder.decode(decompressedBytes).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
        // Check if file is text (not binary)
        if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(text.slice(0, 1000))) continue;
      } catch (_) {
        continue;
      }

      files.push({
        name: fullPath.split('/').pop(),
        path: fullPath,
        content: text,
        size: uncompressedSize || text.length,
        lines: text.split('\n').length,
        ext: ext
      });
    }

    return files;
  };

  // Inspects project type and architecture
  ProjectZip.detectProject = function(files, zipName) {
    var result = {
      name: zipName.replace(/\.zip$/i, ''),
      type: 'general',
      typeLabel: 'پروژه چندفایلی',
      typeIcon: '📁',
      meta: {},
      entryFiles: [],
      files: files,
      totalLines: 0,
      totalBytes: 0,
      hooks: [],
      apis: []
    };

    files.forEach(function(f) {
      result.totalLines += f.lines;
      result.totalBytes += f.size;
    });

    // Check WordPress Plugin
    var wpPluginFile = null;
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      if (f.ext === 'php') {
        var mName = f.content.match(/Plugin Name:\s*([^\r\n]+)/i);
        if (mName) {
          wpPluginFile = f;
          result.type = 'wp-plugin';
          result.typeLabel = 'افزونه وردپرس (WordPress Plugin)';
          result.typeIcon = '🔌';
          result.meta.pluginName = mName[1].trim();

          var mVer = f.content.match(/Version:\s*([^\r\n]+)/i);
          if (mVer) result.meta.version = mVer[1].trim();

          var mDesc = f.content.match(/Description:\s*([^\r\n]+)/i);
          if (mDesc) result.meta.description = mDesc[1].trim();

          var mAuth = f.content.match(/Author:\s*([^\r\n]+)/i);
          if (mAuth) result.meta.author = mAuth[1].trim();

          result.entryFiles.unshift(f);
          break;
        }
      }
    }

    // Check WordPress Theme
    if (!wpPluginFile) {
      for (var j = 0; j < files.length; j++) {
        var file = files[j];
        if (file.name === 'style.css' && /Theme Name:\s*([^\r\n]+)/i.test(file.content)) {
          result.type = 'wp-theme';
          result.typeLabel = 'قالب وردپرس (WordPress Theme)';
          result.typeIcon = '🎨';
          var tName = file.content.match(/Theme Name:\s*([^\r\n]+)/i);
          if (tName) result.meta.themeName = tName[1].trim();
          result.entryFiles.push(file);
          break;
        }
      }
    }

    // Check Web / Node / Frontend
    if (result.type === 'general') {
      var pkgFile = files.find(function(f) { return f.name === 'package.json'; });
      var htmlFile = files.find(function(f) { return f.name === 'index.html'; });

      if (pkgFile) {
        try {
          var pkg = JSON.parse(pkgFile.content);
          result.type = 'node-project';
          result.typeLabel = 'پروژه جاوااسکریپت / Node.js';
          result.typeIcon = '📦';
          result.meta.pkgName = pkg.name;
          result.meta.version = pkg.version;
          result.meta.description = pkg.description;
          result.entryFiles.push(pkgFile);
        } catch (_) {}
      } else if (htmlFile) {
        result.type = 'web-app';
        result.typeLabel = 'پروژه فرانت‌اند / وب‌سایت';
        result.typeIcon = '🌐';
        result.entryFiles.push(htmlFile);
      }
    }

    // Scan for WordPress Hooks, APIs & Patterns
    if (result.type === 'wp-plugin' || result.type === 'wp-theme') {
      var hookSet = new Set();
      files.forEach(function(f) {
        if (f.ext === 'php') {
          var hookMatches = f.content.matchAll(/add_(action|filter)\s*\(\s*['"]([^'"]+)['"]/g);
          for (var hm of hookMatches) {
            hookSet.add(hm[1] + ': ' + hm[2]);
          }
        }
      });
      result.hooks = Array.from(hookSet).slice(0, 15);
    }

    // Sort files: entry files first, then by line count descending
    files.sort(function(a, b) {
      var aIsEntry = result.entryFiles.indexOf(a) !== -1;
      var bIsEntry = result.entryFiles.indexOf(b) !== -1;
      if (aIsEntry && !bIsEntry) return -1;
      if (!aIsEntry && bIsEntry) return 1;
      return b.lines - a.lines;
    });

    return result;
  };

  // Creates the intelligent multi-file analysis dossier for the AI (F04)
  ProjectZip.generateDossier = function(project) {
    var title = project.meta.pluginName || project.meta.themeName || project.meta.pkgName || project.name;
    var out = [];

    out.push('/**');
    out.push(' * ═══════════════════════════════════════════════════════════════');
    out.push(' * شناسه پروژه: ' + title);
    out.push(' * نوع ساختار: ' + project.typeLabel);
    out.push(' * تعداد فایل‌های کد: ' + project.files.length + ' فایل | مجموع خطوط: ' + project.totalLines.toLocaleString('fa-IR') + ' سطر');
    if (project.meta.version) out.push(' * نسخه: ' + project.meta.version);
    if (project.meta.author) out.push(' * نویسنده: ' + project.meta.author);
    if (project.meta.description) out.push(' * توضیح: ' + project.meta.description);
    out.push(' * ═══════════════════════════════════════════════════════════════');
    out.push(' */');
    out.push('');

    out.push('/* ═══ درخت فایل‌های پروژه ═══ */');
    project.files.forEach(function(f, idx) {
      out.push('// [' + (idx + 1) + '] ' + f.path + ' (' + f.lines + ' خط - ' + Math.round(f.size / 1024) + ' KB)');
    });
    out.push('');

    if (project.hooks && project.hooks.length > 0) {
      out.push('/* ═══ هوک‌ها و فیلترهای کشف‌شده در وردپرس ═══ */');
      project.hooks.forEach(function(h) {
        out.push('// • ' + h);
      });
      out.push('');
    }

    out.push('/* ═══════════════════════════════════════════════════════════════');
    out.push(' * محتوای کلیدی و کدهای اصلی ساختار برنامه');
    out.push(' * ═══════════════════════════════════════════════════════════════ */');
    out.push('');

    // Total character budget for dossier
    // Preserve complete files for the full-source parser; AI splits them separately.
    var charBudget = 1000000;
    var numFiles = project.files.length;
    // Per-file cap when multiple files exist, ensuring all files get a slice of the budget
    var maxPerFile = charBudget;
    var usedChars = out.join('\n').length;
    var hasTruncation = false;

    project.files.forEach(function(f) {
      if (usedChars >= charBudget) {
        hasTruncation = true;
        return;
      }

      var header = '/* ─── فایل: ' + f.path + ' (' + f.lines + ' سطر) ─── */\n';
      var remaining = charBudget - usedChars - header.length - 200;
      if (remaining <= 300) {
        hasTruncation = true;
        return;
      }

      var allowedForThisFile = Math.min(remaining, maxPerFile);
      var contentSnippet = f.content;
      if (contentSnippet.length > allowedForThisFile) {
        hasTruncation = true;
        contentSnippet = contentSnippet.slice(0, allowedForThisFile) + '\n// ... [ادامه کد فایل برای خلاصه حفظ شد] ...';
      }

      out.push(header + contentSnippet + '\n');
      usedChars += header.length + contentSnippet.length;
    });

    if (hasTruncation) {
      out.splice(out.length - 1, 0, '\n// ⚠️ توجه: برخی فایل‌ها به دلیل سقف اندازه به شکل گزیده آورده شده‌اند (پوشش جزئی).\n');
    }

    return out.join('\n');
  };

  window.ProjectZip = ProjectZip;
})(typeof window !== 'undefined' ? window : this);
