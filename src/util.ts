import * as path from "path";
import * as reflect from "jsii-reflect";

export async function loadTypeSystem(validate = true) {
  const typeSystem = new reflect.TypeSystem();
  await typeSystem.loadNpmDependencies(path.resolve(__dirname, ".."), {
    validate,
  });
  return typeSystem;
}

export function stackNameFromFileName(fileName: string) {
  return path.parse(fileName).name.replace(".", "-");
}
