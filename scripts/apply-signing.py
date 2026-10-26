#!/usr/bin/env python3
"""Patch the Capacitor-generated android/app/build.gradle to add release
signing driven by keystore.properties (created only when GitHub secrets
are present). Safe to run multiple times."""

import sys

GRADLE_FILE = "android/app/build.gradle"

src = open(GRADLE_FILE).read()
if "keystore.properties" in src:
    print("signing configuration already applied")
    sys.exit(0)

# 1. Point the release build type at the (optional) keystore.properties config.
release_marker = "    buildTypes {\n        release {\n"
if release_marker not in src:
    print("ERROR: release build type block not found in template")
    sys.exit(1)
src = src.replace(
    release_marker,
    "    buildTypes {\n"
    "        release {\n"
    "            if (keystorePropertiesFile.exists()) {\n"
    "                signingConfig signingConfigs.release\n"
    "            }\n",
    1,
)

# 2. Define the signing config before buildTypes.
signing_cfg = (
    "    signingConfigs {\n"
    "        release {\n"
    "            if (keystorePropertiesFile.exists()) {\n"
    "                keyAlias keystoreProperties['keyAlias']\n"
    "                keyPassword keystoreProperties['keyPassword']\n"
    "                storeFile file(keystoreProperties['storeFile'])\n"
    "                storePassword keystoreProperties['storePassword']\n"
    "            }\n"
    "        }\n"
    "    }\n\n"
)
src = src.replace("    buildTypes {", signing_cfg + "    buildTypes {", 1)

# 3. Load keystore.properties at the top of the file.
props = (
    'def keystorePropertiesFile = rootProject.file("keystore.properties")\n'
    "def keystoreProperties = new Properties()\n"
    "if (keystorePropertiesFile.exists()) {\n"
    "    keystorePropertiesFile.withInputStream { keystoreProperties.load(it) }\n"
    "}\n\n"
)
src = props + src

open(GRADLE_FILE, "w").write(src)
print("signing configuration applied")
