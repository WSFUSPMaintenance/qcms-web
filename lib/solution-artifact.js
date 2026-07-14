const crypto = require("node:crypto");
const fs = require("node:fs");
const zlib = require("node:zlib");

const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const CENTRAL_DIRECTORY_ENTRY = 0x02014b50;
const LOCAL_FILE_HEADER = 0x04034b50;
const MAX_ZIP_COMMENT_LENGTH = 0xffff;

function findEndOfCentralDirectory(buffer) {
  const minimumOffset = Math.max(0, buffer.length - (22 + MAX_ZIP_COMMENT_LENGTH));

  for (let offset = buffer.length - 22; offset >= minimumOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === END_OF_CENTRAL_DIRECTORY) return offset;
  }

  throw new Error("ZIP end-of-central-directory record was not found.");
}

function listZipEntries(buffer) {
  const endOffset = findEndOfCentralDirectory(buffer);
  const entryCount = buffer.readUInt16LE(endOffset + 10);
  let offset = buffer.readUInt32LE(endOffset + 16);
  const entries = [];

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== CENTRAL_DIRECTORY_ENTRY) {
      throw new Error(`Invalid ZIP central-directory entry at offset ${offset}.`);
    }

    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const compressionMethod = buffer.readUInt16LE(offset + 10);
    const filenameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const filenameStart = offset + 46;
    const filenameEnd = filenameStart + filenameLength;

    if (filenameEnd > buffer.length) throw new Error("ZIP entry filename extends beyond the archive.");

    entries.push({
      name: buffer.toString("utf8", filenameStart, filenameEnd),
      compressedSize,
      uncompressedSize,
      compressionMethod,
      localHeaderOffset: buffer.readUInt32LE(offset + 42)
    });

    offset = filenameEnd + extraLength + commentLength;
  }

  return entries;
}

function readZipEntry(buffer, entryName) {
  const entry = listZipEntries(buffer).find(candidate => candidate.name === entryName);
  if (!entry) throw new Error(`ZIP entry was not found: ${entryName}`);
  if (buffer.readUInt32LE(entry.localHeaderOffset) !== LOCAL_FILE_HEADER) {
    throw new Error(`Invalid ZIP local-file header for ${entryName}.`);
  }

  const filenameLength = buffer.readUInt16LE(entry.localHeaderOffset + 26);
  const extraLength = buffer.readUInt16LE(entry.localHeaderOffset + 28);
  const dataStart = entry.localHeaderOffset + 30 + filenameLength + extraLength;
  const dataEnd = dataStart + entry.compressedSize;
  if (dataEnd > buffer.length) throw new Error(`ZIP entry data extends beyond the archive: ${entryName}`);

  const compressed = buffer.subarray(dataStart, dataEnd);
  let contents;
  if (entry.compressionMethod === 0) contents = Buffer.from(compressed);
  else if (entry.compressionMethod === 8) contents = zlib.inflateRawSync(compressed);
  else throw new Error(`Unsupported ZIP compression method ${entry.compressionMethod} for ${entryName}.`);

  if (contents.length !== entry.uncompressedSize) {
    throw new Error(`ZIP entry size mismatch for ${entryName}.`);
  }
  return contents;
}

function inspectSolutionArtifact(filename) {
  const buffer = fs.readFileSync(filename);

  return {
    filename,
    size: buffer.length,
    sha256: crypto.createHash("sha256").update(buffer).digest("hex").toUpperCase(),
    entries: listZipEntries(buffer)
  };
}

module.exports = { findEndOfCentralDirectory, inspectSolutionArtifact, listZipEntries, readZipEntry };
