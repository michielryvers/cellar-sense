# adapted from https://github.com/pantuza/c-project-template

BINARY       = atagjs_example
BINDIR       = bin
SRCDIR       = src
LOGDIR       = log
APRILTAG     = apriltag
TESTDIR      = test
WASMDIR      = html

CC           = gcc
STD          = -std=gnu99
STACK        = -fstack-protector-all -Wstack-protector
WARNS        = -Wall -Wextra -pedantic
CFLAGS       = -O3 $(STD) $(STACK) $(WARNS)
DEBUG        = -g3 -DDEBUG=1

LIBS         = -lm -lpthread -I../$(APRILTAG)
APRILTAGS    = -lm -lpthread -I$(APRILTAG)
TEST_LIBS    = -l cmocka -L /usr/lib
TEST_BINARY  = $(BINARY)_test_runner
VALGRIND_TEST_ARGS = test/tag-imgs/*

SRCS             := $(shell ls $(SRCDIR)/*.c | grep -v -e $(SRCDIR)/$(BINARY).c )
OBJS             := $(SRCS:%.c=%.o)
APRILTAG_SRCS    := $(shell ls $(APRILTAG)/*.c $(APRILTAG)/common/*.c | grep -v -e apriltag_pywrap.c -e tagCircle49h12.c -e tagCustom48h12.c -e tagStandard52h13.c)
APRILTAG_OBJS    := $(APRILTAG_SRCS:%.c=%.o)
TEST_SRCS        := $(shell ls $(TESTDIR)/*.c | grep -v -e $(TESTDIR)/main.c )

# ----------------------------------------------------------------
default: $(BINARY)
all:     $(BINARY) apriltag_wasm.js

help:
	@echo "Target rules:"
	@echo "    all      - Builds the example binary and the WASM files"
	@echo "    tests    - Compiles with cmocka and run tests"
	@echo "    valgrind - Runs binary using valgrind"
	@echo "    clean    - Removes binaries and objects"
	@echo "    help     - Prints this help"

$(BINARY): $(APRILTAG_OBJS) $(OBJS) $(SRCDIR)/$(BINARY).o
	$(warning building binary...)
	@mkdir -p $(BINDIR)
	$(CC) -o $(BINDIR)/$(BINARY) $^ $(DEBUG) $(CFLAGS) $(LIBS)
	@echo "\n--\nBinary placed at $(BINDIR)/$(BINARY)"

$(APRILTAG)/%.o: $(APRILTAG)/%.c
	$(warning building apriltag...)
	$(CC) -c $^ -o $@ $(DEBUG) $(CFLAGS) $(APRILTAGS)

%.o: %.c
	$(CC) -c $^ -o $@ $(DEBUG) $(CFLAGS) $(APRILTAGS)

valgrind:
	@mkdir -p $(LOGDIR)
	valgrind --track-origins=yes --leak-check=full --log-file=$(LOGDIR)/$@.log \
	         $(BINDIR)/$(BINARY) $(VALGRIND_TEST_ARGS)
	@echo "\nCheck log: $(LOGDIR)/$@.log"

tests: $(APRILTAG_OBJS) $(OBJS) $(TEST_SRCS)
	@mkdir -p $(BINDIR)
	$(CC) $(TESTDIR)/main.c -o $(BINDIR)/$(TEST_BINARY) $^ $(DEBUG) $(CFLAGS) \
	    $(LIBS) $(TEST_LIBS) -I$(SRCDIR)
	@which ldconfig && ldconfig -C /tmp/ld.so.cache || true
	./$(BINDIR)/$(TEST_BINARY)

# ---------- WASM build ------------------------------------------
apriltag_wasm.js: $(APRILTAG_SRCS) $(SRCS)
	@mkdir -p $(WASMDIR)
	emcc -Os -s MODULARIZE=1 -s 'EXPORT_NAME="AprilTagWasm"' -s WASM=1 \
	     -Iapriltag -s ALLOW_MEMORY_GROWTH=1 \
	     -s EXPORTED_FUNCTIONS='["_free"]' \
	     -s EXPORTED_RUNTIME_METHODS='["cwrap","getValue","setValue","HEAPU8", "HEAP8"]' \
	     -o $(WASMDIR)/$@ $^

docs:
	doxygen

clean:
	@rm -rf $(BINDIR)/* $(APRILTAG)/*.o $(SRCDIR)/*.o $(LOGDIR)/*
