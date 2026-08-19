/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as households from "../households.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_dates from "../lib/dates.js";
import type * as lib_optional from "../lib/optional.js";
import type * as lib_units from "../lib/units.js";
import type * as lib_validation from "../lib/validation.js";
import type * as lists from "../lists.js";
import type * as migrations from "../migrations.js";
import type * as plans from "../plans.js";
import type * as recipes from "../recipes.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  households: typeof households;
  "lib/auth": typeof lib_auth;
  "lib/dates": typeof lib_dates;
  "lib/optional": typeof lib_optional;
  "lib/units": typeof lib_units;
  "lib/validation": typeof lib_validation;
  lists: typeof lists;
  migrations: typeof migrations;
  plans: typeof plans;
  recipes: typeof recipes;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
