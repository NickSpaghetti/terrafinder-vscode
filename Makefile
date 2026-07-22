.PHONY: install lint build compile-tests test audit audit-full package publish clean

install:
	yarn install --frozen-lockfile

lint:
	yarn lint

# Blocking: audits only the dependencies bundled into the packaged extension.
audit:
	yarn audit --level high --groups dependencies

# Informational: audits build/test tooling too (devDependencies), which is
# not shipped to users. Not meant to gate CI - just surface it in logs.
audit-full:
	yarn audit --level high

build:
	yarn compile

compile-tests:
	yarn compile-tests

test: compile-tests build
	yarn exec vscode-test

package:
	yarn vsce package

publish:
	yarn vsce publish

clean:
	rm -rf out dist *.vsix
