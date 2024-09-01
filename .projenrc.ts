import { typescript, javascript, TextFile } from "projen";
// set strict node version
const nodeVersion = "20";
const project = new typescript.TypeScriptProject({
  name: "@envt/beacon-caster",
  npmAccess: javascript.NpmAccess.PUBLIC,
  // repositoryUrl: "https://github.com/environment-toolkit/beacon-caster",
  defaultReleaseBranch: "main",
  packageManager: javascript.NodePackageManager.PNPM,
  pnpmVersion: "9",
  projenrcTs: true,
  prettier: true,
  eslint: true,

  // don't release for now
  release: false,
  releaseToNpm: false,
  // disable github workflows for now
  github: false,

  typescriptVersion: "~5.4",
  devDeps: [
    "@envtio/base",
    "cdktf@^0.20.8",
    "@cdktf/provider-aws@^19.28.0",
    "constructs@^10.3.0",
    "@types/fs-extra@^11",
    "@types/semver",
    "@types/yaml",
    "jsii@~5.4", // must match typescript version
    "fast-check",
  ],
  deps: [
    "constructs@^10.3.0",
    "fs-extra@^11",
    "jsii-reflect@^1.103.1",
    "@jsii/spec@^1.103.1",
    "jsonschema",
    "yaml",
    "chalk@^4",
    "semver",
  ],
  // Beacon Bundle to generate Schema for
  peerDeps: ["@envtio/base@^0.0.3"],
  peerDependencyOptions: {
    pinnedDevDependency: false,
  },
  workflowNodeVersion: nodeVersion,

  // // cdktf testing config
  // jestOptions: {
  //   jestConfig: {
  //     setupFilesAfterEnv: ["<rootDir>/setup.js"],
  //   },
  // },

  licensed: true,
  license: "GPL-3.0-or-later",

  // disable autoMerge for now
  autoMerge: false,

  gitignore: ["cdktf.out"],
});
project.addPackageIgnore("/cdktf.out/");
project.addPackageIgnore("/docs/");
project.addPackageIgnore("/examples/");
project.addPackageIgnore("/*.schema.json");
project.addPackageIgnore("/*.specs.json");

project.package.addEngine("node", nodeVersion);
new TextFile(project, ".nvmrc", {
  lines: [nodeVersion],
});

// improve build speed, use IDE typecheck only
project.tryFindObjectFile("tsconfig.dev.json")?.addOverride("ts-node", {
  transpileOnly: true,
});

project.synth();
