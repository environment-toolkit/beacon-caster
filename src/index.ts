import fs from "fs";
import { renderFullSchema } from "./schema/cdktf-schema";
import { loadTypeSystem } from "./util";

async function main() {
  const typeSystem = await loadTypeSystem();
  const schema = await renderFullSchema(typeSystem, {
    colors: true,
    warnings: true,
    // suppressWarnings: [
    //   // Only an object with methods can satisfy these interfaces and no built-in class is provided
    //   // => This feature is intended as an escape hatch
    //   "aws-cdk-lib.aws_lambda_nodejs.BundlingOptions.commandHooks",
    //   // => These features are mostly intended for user land functionality
    //   "aws-cdk-lib.BundlingOptions.local",
    //   "aws-cdk-lib.Lazy.any",
    //   "aws-cdk-lib.Lazy.uncachedAny",
    // ],
  });
  // write schema to file
  fs.writeFileSync("base.schema.json", JSON.stringify(schema, undefined, 2));
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
