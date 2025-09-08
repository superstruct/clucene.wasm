/**
 * CLucene.wasm Ecosystem Integration Tests
 * Copyright 2025 superstruct ltd, New Zealand
 */

import { describe, it, expect, beforeAll } from 'vitest';
import WASMLoader from '../dist/wasm-loader.js';

describe('Ecosystem Integration', () => {
  let wasmModule;

  beforeAll(async () => {
    const loader = new WASMLoader('./dist/');
    wasmModule = await loader.loadBest();
  });

  it('should load with ecosystem loader', () => {
    expect(wasmModule).toBeDefined();
    expect(wasmModule.malloc).toBeTypeOf('function');
    expect(wasmModule.free).toBeTypeOf('function');
    expect(wasmModule.createIndexWriter).toBeTypeOf('function');
    expect(wasmModule.createIndexSearcher).toBeTypeOf('function');
  });

  it('should provide valid manifest', async () => {
    const loader = new WASMLoader('./dist/');
    const manifest = await loader.loadManifest();
    
    expect(manifest.name).toMatch(/@superstruct\/.*-wasm/);
    expect(manifest.variants.release).toBeDefined();
    expect(manifest.variants.fallback).toBeDefined();
    expect(manifest.capabilities).toBeDefined();
    expect(manifest.exports).toBeDefined();
  });

  it('should detect browser features', async () => {
    const features = await WASMLoader.detectFeatures();
    
    expect(features).toHaveProperty('wasm');
    expect(features).toHaveProperty('simd');
    expect(features).toHaveProperty('threads');
    expect(features).toHaveProperty('memory64');
    expect(features.wasm).toBe(true); // Should be true in test environment
  });

  it('should handle memory operations', () => {
    const testString = 'Hello, CLucene.wasm!';
    const ptr = wasmModule.writeString(testString);
    
    expect(ptr).toBeGreaterThan(0);
    
    const retrieved = wasmModule.readString(ptr);
    expect(retrieved).toBe(testString);
    
    wasmModule.free(ptr);
  });

  it('should handle filesystem operations', () => {
    const testPath = '/test/data.txt';
    const testContent = 'Test document content';
    
    // Create directory structure if needed
    if (wasmModule.exports.FS) {
      try {
        wasmModule.exports.FS.mkdir('/test');
      } catch (e) {
        // Directory might already exist
      }
      
      wasmModule.preloadFile(testPath, testContent);
      
      expect(wasmModule.fileExists(testPath)).toBe(true);
      expect(wasmModule.readFile(testPath)).toBe(testContent);
    }
  });

  it('should create and use index writer', () => {
    const indexPath = '/tmp/test-index';
    
    // Create index directory
    if (wasmModule.exports.FS) {
      try {
        wasmModule.exports.FS.mkdir('/tmp');
        wasmModule.exports.FS.mkdir(indexPath);
      } catch (e) {
        // Directories might already exist
      }
    }
    
    const writerPtr = wasmModule.createIndexWriter(indexPath);
    expect(writerPtr).toBeGreaterThan(0);
    
    const result = wasmModule.addDocument(writerPtr, 'This is a test document for indexing.');
    expect(result).toBeGreaterThanOrEqual(0);
    
    wasmModule.closeIndexWriter(writerPtr);
  });

  it('should create and use index searcher', () => {
    const indexPath = '/tmp/search-index';
    
    // Create and populate index
    if (wasmModule.exports.FS) {
      try {
        wasmModule.exports.FS.mkdir('/tmp');
        wasmModule.exports.FS.mkdir(indexPath);
      } catch (e) {
        // Directories might already exist
      }
    }
    
    // Add some documents
    const writerPtr = wasmModule.createIndexWriter(indexPath);
    wasmModule.addDocument(writerPtr, 'The quick brown fox jumps over the lazy dog.');
    wasmModule.addDocument(writerPtr, 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.');
    wasmModule.addDocument(writerPtr, 'WebAssembly enables high-performance applications on the web.');
    wasmModule.closeIndexWriter(writerPtr);
    
    // Search the index
    const searcherPtr = wasmModule.createIndexSearcher(indexPath);
    expect(searcherPtr).toBeGreaterThan(0);
    
    const resultsPtr = wasmModule.search(searcherPtr, 'quick fox', 10);
    expect(resultsPtr).toBeGreaterThanOrEqual(0);
    
    const results = wasmModule.getSearchResults(resultsPtr);
    expect(Array.isArray(results)).toBe(true);
    
    if (results.length > 0) {
      expect(results[0]).toHaveProperty('content');
      expect(results[0]).toHaveProperty('score');
      expect(results[0].content).toContain('fox');
    }
    
    wasmModule.closeIndexSearcher(searcherPtr);
  });

  it('should handle concurrent operations', async () => {
    const operations = [];
    
    for (let i = 0; i < 10; i++) {
      operations.push((async () => {
        const testString = `Test string ${i}`;
        const ptr = wasmModule.writeString(testString);
        const retrieved = wasmModule.readString(ptr);
        wasmModule.free(ptr);
        return retrieved === testString;
      })());
    }
    
    const results = await Promise.all(operations);
    expect(results.every(r => r === true)).toBe(true);
  });
});