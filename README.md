# Beacon Caster

> [!IMPORTANT]
> Heavily based on [deCDK- Declarative CDK](https://github.com/cdklabs/decdk)

Generate JSON Schema for `@envtio/base` Beacon Bundle (hardcoded).

```console
pnpm dlx ts-node --project ./tsconfig.dev.json src/index.ts
```

Okay, we are ready to begin with a simple example. Create a file called `landing-page.yaml`:

```yaml
# yaml-language-server: $schema=./base.schema.json
Resources:
  SiteBucket:
    Type: "@envtio/base.aws.staticsite.Bucket"
    Properties:
      namePrefix: "hello-world"
      path: "./website"
      websiteConfig:
        enabled: true
      public: true # no cdn
      registerOutputs: true
      outputName: "website"
```

## Roadmap

- [x] PoC generate json schema for `@envtio/base` beacon bundle
- [ ] Clean up unused packages and src code (this doesn't build right now...)
