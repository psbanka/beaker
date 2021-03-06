#
# Makefile to define some common beaker make targets
# Copyright (c) 2015 Ciena Corporation. All rights reserved.
#

SHELL := /bin/bash
HIDE ?= @
ENV ?= $(HIDE)source env.sh &&
VERSION := $(shell grep -o '"version":.*",' package.json | awk '{ print $$2; }' | sed -e 's/[",]//g')
IS_BEAKER ?= 0
JSON_TABS ?= 4
export JSON_TABS

ESLINT_FILES ?= ./Gruntfile.js src spec demo/js
ESLINT_RULES_DIR ?= $(shell pwd)/node_modules/beaker/src/eslint-rules
BEAKER_BIN ?= beaker
export IS_BEAKER

.PHONY: \
	build \
	build-mock \
	lint \
	package-test \
	update-eslintrc \
	version-bumped \
	bump-version

build:
	$(ENV)grunt build

build-mock:
	$(ENV)MOCK_APIS=1 grunt webpack:build-dev

lint:
ifeq ($(IS_BEAKER), 0)
	-$(ENV)cmp .eslintrc node_modules/beaker/lib/.eslintrc || echo "warning '.eslintrc' is out of date, run 'make update-eslintrc' for latest version."
else
	$(ENV)bin/verify-eslintrc.sh
endif
	$(ENV)eslint --rulesdir=$(ESLINT_RULES_DIR) $(ESLINT_FILES)

package-test:
	$(HIDE) echo "WARNING: the package-test target is DEPRECATED, please remove it from your Makefile."

update-eslintrc:
ifeq ($(IS_BEAKER), 1)
	$(ENV)echo "For beaker you must manually update the '.eslintrc' file." 1>&2
else
	$(ENV)cp node_modules/beaker/lib/.eslintrc .eslintrc
endif

version-bumped:
ifndef REPO
	$(error REPO variable needs to be set)
else
	$(HIDE)echo "Checking that PR for current commit has version bump comment"
	$(ENV)$(BEAKER_BIN) github version-bumped --repo $(REPO) --sha $(shell git rev-parse HEAD)
endif

bump-version:
ifndef REPO
	$(error REPO variable needs to be set)
else
	$(HIDE)echo "Bumping version"
	$(ENV)$(BEAKER_BIN) github bump-version --repo $(REPO)
endif

# pretty-print JSON files
%.json.pretty:
	$(ENV)cat $(subst .pretty,,$@) | json -o json-$(JSON_TABS) > $@.tmp
	$(HIDE)mv $@.tmp $(subst .pretty,,$@)
