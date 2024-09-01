import chalk from "chalk";
import * as reflect from "jsii-reflect";
import { schemaForIntrinsicFunctions } from "./intrinsics";
import {
  SchemaContext,
  // schemaForEnumLikeClass,
  schemaForTypeReference,
} from "./jsii2schema";
// import { schemaForRules } from "./rules";
import { hasPropsParam } from "../type-system";

/* eslint-disable no-console */

export interface RenderSchemaOptions {
  /**
   * Show warnings for the generated schema.
   * @default false
   */
  warnings?: boolean;

  /**
   * Suppress specific warnings in the warnings output.
   * Should only be used for known issues that are expected to create a warning due to their incompatibility with declarative style.
   * @default []
   */
  suppressWarnings?: string[];

  /**
   * Use colors when printing output.
   * @default true if tty is enabled
   */
  colors?: boolean;
}

function overrideDefinition() {
  return {
    additionalProperties: false,
    type: "object",
    properties: {
      ChildConstructPath: {
        type: "string",
        pattern: "[a-zA-Z0-9\\-\\._]+",
      },
      RemoveResource: {
        type: "boolean",
      },
      Delete: {
        type: "object",
        properties: {
          Path: {
            type: "string",
            pattern: "[a-zA-Z0-9\\-\\._]+",
          },
        },
        required: ["Path"],
      },
      Update: {
        type: "object",
        properties: {
          Path: {
            type: "string",
            pattern: "[a-zA-Z0-9\\-\\._]+",
          },
          Value: {},
        },
        required: ["Path"],
      },
    },
    required: ["ChildConstructPath"],
    oneOf: [
      {
        required: ["Delete"],
      },
      {
        required: ["Update"],
      },
      {
        required: ["RemoveResource"],
      },
    ],
  };
}

function dependsOnDefinition() {
  return {
    additionalProperties: false,
    type: ["array", "string"],
    items: {
      type: "string",
    },
  };
}

export function renderFullSchema(
  typeSystem: reflect.TypeSystem,
  options: RenderSchemaOptions = {},
) {
  if (!process.stdin.isTTY || options.colors === false) {
    // Disable chalk color highlighting
    process.env.FORCE_COLOR = "0";
  }

  // Find all constructs and top-level classes
  // const constructType = typeSystem.findClass("constructs.Construct");
  const awsBeaconBaseType = typeSystem.findClass(
    "@envtio/base.aws.AwsBeaconBase",
  );

  // const constructs = typeSystem.classes.filter(
  //   (c) => c.extends(constructType) && !c.extends(beaconBaseType),
  // );
  const awsBeaconClasses = typeSystem.classes.filter((c) =>
    c.extends(awsBeaconBaseType),
  );

  const deconstructs: ClassAndProps[] = [
    // ...constructs.map((c) => unpackTopLevel(c, 2)),
    ...awsBeaconClasses.map((c) => unpackTopLevel(c, 2)),
  ].filter((c): c is ClassAndProps => !!c);
  console.log("Found " + deconstructs.length + " resources");
  console.log(
    JSON.stringify(
      deconstructs.map((c) => ({
        fqn: c.class.fqn,
        propsType: c.propsTypeRef?.fqn,
      })),
      null,
      2,
    ),
  );

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const output = require("../../et-spec.schema.json");

  output.definitions = output.definitions || {};

  const ctx = SchemaContext.root(output.definitions);
  // TODO: Support expressions again?
  // , {
  //   string: "StringExpression",
  //   number: "NumberExpression",
  //   boolean: "BooleanExpression",
  // });

  // // this adds CloudFormation intrinsic functions to the schema
  schemaForIntrinsicFunctions(ctx); // edited to only register ["Ref", "Fn::Ref"] functions
  // // this adds CloudFormation functions for rules section to the schema
  // addRulesSection();

  for (const deco of deconstructs) {
    console.log("Adding resource for " + deco.class.fqn);
    addResource(schemaForResource(deco, ctx));
  }

  // // Top-level static method calls
  // {
  //   for (const type of typeSystem.classes) {
  //     console.log("Adding top level static method calls for " + type.fqn);
  //     addResource(schemaForEnumLikeClass(type, ctx));
  //   }
  // }

  output.properties.$schema = {
    type: "string",
  };

  if (options.warnings) {
    printWarnings(ctx, options.suppressWarnings ?? []);
  }

  function addResource(resource?: { $ref: string }) {
    if (resource) {
      output.properties.Resources.patternProperties[
        "^[a-zA-Z0-9]+$"
      ].anyOf.push(resource);
    }
  }

  // function addRulesSection() {
  //   output.properties.Rules = schemaForRules(ctx);
  // }

  return output;
}

function printWarnings(node: SchemaContext, suppress: string[], indent = "") {
  if (!node.hasWarningsOrErrors(suppress)) {
    return;
  }

  console.error(indent + node.name);

  for (const warning of node.warnings) {
    console.error(chalk.yellow(indent + "  " + warning));
  }

  for (const error of node.errors) {
    console.error(chalk.red(indent + "  " + error));
  }

  if (!node.root) {
    indent += "  ";
  }

  for (const child of node.children) {
    printWarnings(child, suppress, indent);
  }
}

export function schemaForResource(
  construct: ClassAndProps,
  ctx: SchemaContext,
) {
  if (
    // construct.class.fqn.startsWith("cdktf.") ||
    construct.class.fqn.startsWith("@cdktf/provider-aws.")
  ) {
    console.log("Skipping resource " + construct.class.fqn);
    return;
  }
  ctx = ctx.child("resource", construct.class.fqn);

  return ctx.define(construct.class.fqn, () => {
    return {
      additionalProperties: false,
      properties: {
        Properties: schemaForProps(construct.propsTypeRef, ctx),
        Call: ctx.define("Call", schemaForCall),
        Type: {
          enum: [construct.class.fqn],
          type: "string",
        },
        Tags: {
          type: "array",
          items: ctx.define("Tag", () => {}),
        },
        DependsOn: ctx.define("DependsOn", dependsOnDefinition),
        Overrides: {
          type: "array",
          items: ctx.define("Override", overrideDefinition),
        },
      },
      required: ["Type"],
    };
  });
}

function schemaForProps(
  propsTypeRef: reflect.TypeReference | undefined,
  ctx: SchemaContext,
) {
  if (!propsTypeRef) {
    return;
  }
  // if (propsTypeRef.fqn?.startsWith("@cdktf/provider-aws.")) {
  //   console.log("Skipping props " + propsTypeRef.fqn);
  //   return;
  // }
  return schemaForTypeReference(propsTypeRef, ctx);
}

export function schemaForCall() {
  return {
    anyOf: [
      {
        type: "object",
      },
      { type: "array", minItems: 1, maxItems: 2 },
    ],
  };
}

// find initializer and props parameter index for a class
function unpackTopLevel(
  klass: reflect.ClassType,
  propsParamAt: number,
): ClassAndProps | undefined {
  if (!hasPropsParam(klass, propsParamAt)) {
    console.log("skipping (no propsParam) " + (klass as reflect.ClassType).fqn);
    return undefined;
  }

  return {
    class: klass,
    propsTypeRef: klass.initializer?.parameters?.[propsParamAt]?.type,
  };
}

export interface ClassAndProps {
  class: reflect.ClassType;
  propsTypeRef?: reflect.TypeReference;
}
