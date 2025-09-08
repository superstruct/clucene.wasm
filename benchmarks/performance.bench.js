/**
 * CLucene.wasm Performance Benchmarks
 * Copyright 2025 superstruct ltd, New Zealand
 */

import { bench, describe } from 'vitest';
import WASMLoader from '../dist/wasm-loader.js';

describe('CLucene.wasm Performance Benchmarks', () => {
  let wasmModule;
  const testDocuments = [];
  
  // Generate test documents
  for (let i = 0; i < 1000; i++) {
    testDocuments.push(
      `Document ${i}: Lorem ipsum dolor sit amet, consectetur adipiscing elit. ` +
      `Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ` +
      `Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris. ` +
      `Test keyword ${i % 100} for searching and relevance scoring.`
    );
  }

  beforeAll(async () => {
    const loader = new WASMLoader('./dist/');
    wasmModule = await loader.loadBest();
    
    // Setup test index
    if (wasmModule.exports.FS) {
      try {
        wasmModule.exports.FS.mkdir('/benchmark');
      } catch (e) {
        // Directory might exist
      }
    }
  });

  bench('Memory allocation and deallocation', () => {
    const pointers = [];
    
    // Allocate 100 strings
    for (let i = 0; i < 100; i++) {
      const testString = `Test string number ${i}`;
      pointers.push(wasmModule.writeString(testString));
    }
    
    // Free all allocations
    for (const ptr of pointers) {
      wasmModule.free(ptr);
    }
  }, { iterations: 1000 });

  bench('String encoding/decoding operations', () => {
    const testString = 'The quick brown fox jumps over the lazy dog. ' +
                      '这是一个测试字符串包含中文字符。' +
                      '🚀 Unicode emoji support test 🔍';
    
    const ptr = wasmModule.writeString(testString);
    const decoded = wasmModule.readString(ptr);
    wasmModule.free(ptr);
    
    if (decoded !== testString) {
      throw new Error('String encoding/decoding failed');
    }
  }, { iterations: 10000 });

  bench('Index creation with 100 documents', async () => {
    const indexPath = `/benchmark/index-${Date.now()}`;
    
    if (wasmModule.exports.FS) {
      try {
        wasmModule.exports.FS.mkdir(indexPath);
      } catch (e) {
        // Directory might exist
      }
    }
    
    const writerPtr = wasmModule.createIndexWriter(indexPath);
    
    // Add 100 documents
    for (let i = 0; i < 100; i++) {
      wasmModule.addDocument(writerPtr, testDocuments[i]);
    }
    
    wasmModule.closeIndexWriter(writerPtr);
  }, { iterations: 10 });

  bench('Search operations on populated index', async () => {
    // Create a shared index for search benchmarks
    const indexPath = '/benchmark/search-index';
    
    if (wasmModule.exports.FS) {
      try {
        wasmModule.exports.FS.mkdir(indexPath);
      } catch (e) {
        // Directory might exist
      }
    }
    
    // Populate index if not already done
    if (!wasmModule.fileExists(indexPath + '/segments.gen')) {
      const writerPtr = wasmModule.createIndexWriter(indexPath);
      for (let i = 0; i < 500; i++) {
        wasmModule.addDocument(writerPtr, testDocuments[i]);
      }
      wasmModule.closeIndexWriter(writerPtr);
    }
    
    const searcherPtr = wasmModule.createIndexSearcher(indexPath);
    const queries = [
      'lorem ipsum',
      'keyword 42',
      'test document',
      'consectetur adipiscing',
      'magna aliqua'
    ];
    
    for (const query of queries) {
      const resultsPtr = wasmModule.search(searcherPtr, query, 20);
      const results = wasmModule.getSearchResults(resultsPtr);
      
      if (results.length === 0) {
        console.warn(`No results found for query: ${query}`);
      }
    }
    
    wasmModule.closeIndexSearcher(searcherPtr);
  }, { iterations: 100 });

  bench('Concurrent memory operations', async () => {
    const operations = [];
    
    for (let i = 0; i < 50; i++) {
      operations.push((async () => {
        const testData = `Concurrent operation ${i}: ${Math.random()}`;
        const ptr = wasmModule.writeString(testData);
        
        // Simulate some work
        await new Promise(resolve => setTimeout(resolve, 1));
        
        const retrieved = wasmModule.readString(ptr);
        wasmModule.free(ptr);
        
        return retrieved === testData;
      })());
    }
    
    const results = await Promise.all(operations);
    
    if (!results.every(r => r === true)) {
      throw new Error('Concurrent operations failed');
    }
  }, { iterations: 20 });

  bench('Large document indexing', () => {
    const indexPath = `/benchmark/large-doc-${Date.now()}`;
    
    if (wasmModule.exports.FS) {
      try {
        wasmModule.exports.FS.mkdir(indexPath);
      } catch (e) {
        // Directory might exist
      }
    }
    
    const largeDocument = testDocuments.join(' ').repeat(10); // ~50KB document
    
    const writerPtr = wasmModule.createIndexWriter(indexPath);
    wasmModule.addDocument(writerPtr, largeDocument);
    wasmModule.closeIndexWriter(writerPtr);
  }, { iterations: 5 });

  bench('File system operations', () => {
    const testPath = `/benchmark/fs-test-${Date.now()}.txt`;
    const testContent = 'File system test content with some data to write and read back.';
    
    // Write file
    wasmModule.preloadFile(testPath, testContent);
    
    // Check existence
    const exists = wasmModule.fileExists(testPath);
    
    // Read file
    const content = wasmModule.readFile(testPath);
    
    if (!exists || content !== testContent) {
      throw new Error('File system operations failed');
    }
  }, { iterations: 1000 });
});