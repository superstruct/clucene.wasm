#!/bin/bash
# CLucene.wasm Build Script
# Copyright 2025 superstruct ltd, New Zealand

set -euo pipefail

VARIANT="${1:-release}"
ROOT_DIR="$(pwd)"
BUILD_DIR="${ROOT_DIR}/build-${VARIANT}"
DIST_DIR="${ROOT_DIR}/dist"

# Create output directories
mkdir -p "$BUILD_DIR" "$DIST_DIR"

# WASM build configuration
case "$VARIANT" in
  "release")
    CMAKE_FLAGS=(
      -DCMAKE_BUILD_TYPE=Release
      -DBUILD_SHARED_LIBRARIES=OFF
      -DBUILD_STATIC_LIBRARIES=ON
      -DLUCENE_USE_INTERNAL_CHAR_FUNCTIONS=ON
    )
    EMCC_FLAGS=(
      -O3 -flto --closure 1
      -s WASM=1
      -s ALLOW_MEMORY_GROWTH=1
      -s INITIAL_MEMORY=67108864
      -s MAXIMUM_MEMORY=268435456
      -s EXPORT_ES6=1
      -s MODULARIZE=1
      -s USE_ES6_IMPORT_META=0
      -s ENVIRONMENT=web,webview,worker
    )
    ;;
  "simd")
    CMAKE_FLAGS=(
      -DCMAKE_BUILD_TYPE=Release
      -DBUILD_SHARED_LIBRARIES=OFF
      -DBUILD_STATIC_LIBRARIES=ON
      -DLUCENE_USE_INTERNAL_CHAR_FUNCTIONS=ON
    )
    EMCC_FLAGS=(
      -O3 -flto -msimd128
      -s WASM=1
      -s ALLOW_MEMORY_GROWTH=1
      -s INITIAL_MEMORY=67108864
      -s MAXIMUM_MEMORY=268435456
      -s EXPORT_ES6=1
      -s MODULARIZE=1
      -s USE_ES6_IMPORT_META=0
      -s ENVIRONMENT=web,webview,worker
      -s SIMD=1
    )
    ;;
  "threading")
    CMAKE_FLAGS=(
      -DCMAKE_BUILD_TYPE=Release
      -DBUILD_SHARED_LIBRARIES=OFF
      -DBUILD_STATIC_LIBRARIES=ON
      -DLUCENE_USE_INTERNAL_CHAR_FUNCTIONS=ON
    )
    EMCC_FLAGS=(
      -O3 -flto -pthread
      -s WASM=1
      -s ALLOW_MEMORY_GROWTH=1
      -s INITIAL_MEMORY=67108864
      -s MAXIMUM_MEMORY=268435456
      -s EXPORT_ES6=1
      -s MODULARIZE=1
      -s USE_ES6_IMPORT_META=0
      -s ENVIRONMENT=web,webview,worker
      -s PTHREAD_POOL_SIZE=4
      -s PROXY_TO_PTHREAD=1
      -s MALLOC=mimalloc
    )
    ;;
  "fallback")
    CMAKE_FLAGS=(
      -DCMAKE_BUILD_TYPE=Release
      -DBUILD_SHARED_LIBRARIES=OFF
      -DBUILD_STATIC_LIBRARIES=ON
      -DLUCENE_USE_INTERNAL_CHAR_FUNCTIONS=ON
      -D_CL_DISABLE_MULTITHREADING=ON
    )
    EMCC_FLAGS=(
      -O2
      -s WASM=1
      -s ALLOW_MEMORY_GROWTH=1
      -s INITIAL_MEMORY=33554432
      -s MAXIMUM_MEMORY=134217728
      -s EXPORT_ES6=1
      -s MODULARIZE=1
      -s USE_ES6_IMPORT_META=0
      -s ENVIRONMENT=web,webview,worker
    )
    ;;
  *)
    echo "Unknown variant: $VARIANT"
    echo "Supported variants: release, simd, threading, fallback"
    exit 1
    ;;
esac

# Export build flags for CMake
export CFLAGS="${EMCC_FLAGS[*]}"
export CXXFLAGS="${EMCC_FLAGS[*]}"
export CMAKE_TOOLCHAIN_FILE="$EMSDK/upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake"

echo "Building CLucene.wasm variant: $VARIANT"
echo "Build directory: $BUILD_DIR"

cd "$BUILD_DIR"

# Configure with CMake
emcmake cmake "${CMAKE_FLAGS[@]}" \
  -DCMAKE_INSTALL_PREFIX="$BUILD_DIR/install" \
  -DCMAKE_CROSSCOMPILING_EMULATOR="$NODE" \
  -DZLIB_INCLUDE_DIR="$EMSDK_NODE/include" \
  -DZLIB_LIBRARY="$EMSDK_NODE/lib/libz.a" \
  "$ROOT_DIR"

# Build the project
emmake make -j"$(nproc)"

# Install locally
make install

# Copy outputs to dist
cp "install/lib/libclucene-core-static.a" "$DIST_DIR/clucene-${VARIANT}.a" 2>/dev/null || true
cp "install/lib/libclucene-shared-static.a" "$DIST_DIR/clucene-shared-${VARIANT}.a" 2>/dev/null || true

# Create WASM module from static libraries
echo "Creating WASM module for variant: $VARIANT"
emcc "${EMCC_FLAGS[@]}" \
  -o "$DIST_DIR/clucene-${VARIANT}.js" \
  "$DIST_DIR/clucene-${VARIANT}.a" \
  "$DIST_DIR/clucene-shared-${VARIANT}.a" \
  -lz

echo "Build completed: $VARIANT"
echo "Output files:"
ls -la "$DIST_DIR/clucene-${VARIANT}.*"