# ────────────────────────────────────────────────────────────────
# Build Apriltag-JS-Standalone                                   
# https://github.com/arenaxr/apriltag-js-standalone              
# ────────────────────────────────────────────────────────────────
FROM ubuntu:22.04 AS builder

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential  git  clang  cmake  python3  curl  wget \
        libcmocka-dev    valgrind  doxygen  ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# -------  Emscripten tool-chain ---------------------------------
RUN git clone https://github.com/emscripten-core/emsdk.git /opt/emsdk \
 &&  /opt/emsdk/emsdk install latest \
 &&  /opt/emsdk/emsdk activate latest

# make emcc, em++ … visible for every future shell
ENV PATH="/opt/emsdk:${PATH}"
ENV EM_CONFIG="/opt/emsdk/.emscripten"
ENV EMSDK="/opt/emsdk"
ENV EM_CACHE="/opt/emsdk/upstream/emscripten/cache"
SHELL ["/bin/bash", "-lc"]

# -------  Clone & build the detector ----------------------------
WORKDIR /workspace
RUN git config --global url."https://github.com/".insteadOf git@github.com:
RUN git clone --recursive https://github.com/arenaxr/apriltag-js-standalone.git
WORKDIR /workspace/apriltag-js-standalone

# Default target builds both the C example and the WASM bundle
RUN source /opt/emsdk/emsdk_env.sh && \
    sed -i 's/EXTRA_EXPORTED_RUNTIME_METHODS/EXPORTED_RUNTIME_METHODS/g' Makefile && \
    make apriltag_wasm.js
