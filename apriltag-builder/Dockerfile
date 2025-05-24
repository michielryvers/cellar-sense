# ────────────────────────────────────────────────────────────────
# Build Apriltag-JS-Standalone (WASM + example binary)
# ────────────────────────────────────────────────────────────────
FROM ubuntu:22.04 AS builder

ENV DEBIAN_FRONTEND=noninteractive

# ---- base tool-chain & libs ------------------------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential git clang cmake python3 curl wget         \
        libcmocka-dev valgrind doxygen ca-certificates            \
    && rm -rf /var/lib/apt/lists/*

# ---- Emscripten ------------------------------------------------
RUN git clone https://github.com/emscripten-core/emsdk.git /opt/emsdk && \
    /opt/emsdk/emsdk install latest && \
    /opt/emsdk/emsdk activate latest

ENV PATH="/opt/emsdk:${PATH}"
ENV EM_CONFIG="/opt/emsdk/.emscripten"
ENV EMSDK="/opt/emsdk"
ENV EM_CACHE="/opt/emsdk/upstream/emscripten/cache"
SHELL ["/bin/bash", "-lc"]

# ---- clone repo ------------------------------------------------
WORKDIR /workspace
# make sure any git@github.com: sub-modules resolve over HTTPS
RUN git config --global url."https://github.com/".insteadOf git@github.com:
RUN git clone --recursive https://github.com/arenaxr/apriltag-js-standalone.git

# ---- inject our patched Makefile ------------------------------
# (Makefile must live next to this Dockerfile in the build context)
COPY Makefile /workspace/apriltag-js-standalone/Makefile

# ---- build -----------------------------------------------------
WORKDIR /workspace/apriltag-js-standalone
RUN source /opt/emsdk/emsdk_env.sh && \
    make all          # builds atagjs_example *and* apriltag_wasm.js
